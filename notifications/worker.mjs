import webpush from 'web-push';
import {ORIGIN,APP_URL,validPayload,reconcile,nextAlarm} from './core.mjs';
const headers={'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Cache-Control':'no-store'};
const json=(value,status=200)=>Response.json(value,{status,headers});
async function body(request){const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0,text='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw Error('size');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}
export default {async fetch(request,env){
  if(request.headers.get('Origin')!==ORIGIN)return new Response('Forbidden',{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, PUT, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
  const path=new URL(request.url).pathname;
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return json({error:'Servicio no configurado'},503);
  if(path==='/config'&&request.method==='GET')return json({ready:true,publicKey:env.VAPID_PUBLIC_KEY,protocol:1});
  if(!['/device','/test','/status'].includes(path))return json({error:'Ruta no disponible'},404);
  const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if(!token)return json({error:'Acceso no válido'},401);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const device=env.REMINDERS.get(env.REMINDERS.idFromName(id));
  if(path==='/device'&&request.method==='DELETE')return device.fetch(new Request('https://internal/device',{method:'DELETE'}));
  if(path==='/status'&&request.method==='GET')return device.fetch('https://internal/status');
  if((path==='/device'&&request.method==='PUT')||(path==='/test'&&request.method==='POST')){
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Formato no válido'},400);
    let payload;try{payload=await body(request);}catch{return json({error:'Datos no válidos'},400);}
    if(path==='/device'&&!validPayload(payload))return json({error:'Recordatorios no válidos o demasiados (máximo 200)'},400);
    return device.fetch(new Request('https://internal'+path,{method:request.method,body:JSON.stringify(payload)}));
  }
  return json({error:'Método no disponible'},405);
}};
export class DeviceReminders {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async schedule(record){const next=nextAlarm(record.tasks);const testAt=record.testAt||null;const at=next===null?testAt:testAt===null?next:Math.min(next,testAt);if(at===null)await this.ctx.storage.deleteAlarm();else await this.ctx.storage.setAlarm(Math.max(Date.now()+100,at));}
  async fetch(request){return this.ctx.blockConcurrencyWhile(async()=>{
    const path=new URL(request.url).pathname;
    let record=await this.ctx.storage.get('record');
    if(request.method==='DELETE'){await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();return json({ok:true});}
    if(path==='/status')return json({registered:!!record,pending:record?.tasks.filter(t=>!t.sent).length||0,lastAcceptedAt:record?.lastAcceptedAt||null,failed:record?.tasks.filter(t=>t.attempts>=6&&!t.sent).length||0});
    if(path==='/device'){
      const p=await request.json();if(record&&p.revision<record.revision)return json({error:'Revisión antigua'},409);
      record={...record,revision:p.revision,subscription:{endpoint:p.subscription.endpoint,keys:{p256dh:p.subscription.keys.p256dh,auth:p.subscription.keys.auth}},tasks:reconcile(record?.tasks||[],p.tasks)};
      await this.ctx.storage.put('record',record);await this.schedule(record);return json({ok:true,pending:record.tasks.filter(t=>!t.sent).length});
    }
    if(path==='/test'){
      if(!record)return json({error:'Activa antes los avisos'},409);
      if(record.lastTestAt&&Date.now()-record.lastTestAt<60000)return json({error:'Espera un minuto entre pruebas'},429);
      record.testAttempts=0;record.testAt=Date.now()+60000;record.lastTestAt=Date.now();record.testId=crypto.randomUUID();await this.ctx.storage.put('record',record);await this.schedule(record);return json({ok:true,at:record.testAt});
    }
    return json({error:'Ruta no disponible'},404);
  });}
  async deliver(subscription,notice){
    const details=webpush.generateRequestDetails(subscription,JSON.stringify(notice),{TTL:86400,urgency:'high',vapidDetails:{subject:APP_URL,publicKey:this.env.VAPID_PUBLIC_KEY,privateKey:this.env.VAPID_PRIVATE_KEY}});
    return fetch(details.endpoint,{method:details.method,headers:details.headers,body:details.body,redirect:'manual',signal:AbortSignal.timeout(12000)});
  }
  async alarm(){return this.ctx.blockConcurrencyWhile(async()=>{
    const record=await this.ctx.storage.get('record');if(!record)return;
    const now=Date.now();
    const due=record.tasks.filter(t=>!t.sent&&t.attempts<6&&Math.max(t.at,t.retryAt||0)<=now).slice(0,1);
    if(record.testAt&&record.testAt<=now)due.push({id:'test',at:record.testAt,test:true});
    for(const item of due){
      if(!item.test&&now-item.at>86400000){item.sent=true;continue;}
      try{
        const response=await this.deliver(record.subscription,{kind:item.test?'test':'task',id:item.id,at:item.at,key:item.test?record.testId:item.id+':'+item.at});
        if([404,410].includes(response.status)){await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();return;}
        if(!response.ok)throw Error('push rejected');
        record.lastAcceptedAt=Date.now();if(item.test)delete record.testAt;else item.sent=true;
      }catch{
        if(item.test){record.testAttempts=(record.testAttempts||0)+1;if(record.testAttempts>=6)delete record.testAt;else record.testAt=Date.now()+60000;}
        else{item.attempts++;item.retryAt=Date.now()+Math.min(900000,30000*2**item.attempts);}
      }
      await this.ctx.storage.put('record',record);
    }
    await this.ctx.storage.put('record',record);await this.schedule(record);
  });}
}
