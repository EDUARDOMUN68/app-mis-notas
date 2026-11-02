import './reminder-db.js';
import {serverTasks} from './dates.mjs';
export const API='https://mis-notas-recordatorios.madridista-lineup-notices.workers.dev';
const CONFIG='mis-notas-notification-device';
const $=id=>document.getElementById(id);
const db=globalThis.notesReminderDB;
let latest=[],config=null,pending=false,running=false,disabled=false,paused=false,readyWorker=null;
function message(text,error=false){$('notice-status').textContent=text;$('notice-status').className=error?'error':'';}
function load(){try{config=JSON.parse(localStorage.getItem(CONFIG)||'null');}catch{config=null;}}
function persist(){localStorage.setItem(CONFIG,JSON.stringify(config));}
async function request(path,method='GET',payload){const r=await fetch(API+path,{method,headers:{...(payload?{'Content-Type':'application/json'}:{}),...(config?.token?{Authorization:'Bearer '+config.token}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(20000)});const body=await r.json();if(!r.ok)throw Error(body.error||'No se ha podido conectar con los avisos.');return body;}
function controls(){const on=!!config?.enabled;$('notify-enable').hidden=on;$('notify-test').hidden=!on;$('notify-disable').hidden=!on;}
async function mirror(){await db.write('mirror',{enabled:!!config?.enabled&&!disabled,tasks:latest});}
async function checkWorker(){
  const registration=await navigator.serviceWorker.getRegistration();if(!registration)throw Error('Cierra y vuelve a abrir la app para actualizar los avisos.');
  await registration.update();
  if(registration.waiting)registration.waiting.postMessage({type:'activate-reminder-worker'});
  const until=Date.now()+15000;
  while(Date.now()<until){
    const worker=registration.active;
    if(worker){const version=await new Promise(resolve=>{const ch=new MessageChannel();const timer=setTimeout(()=>resolve(null),600);ch.port1.onmessage=e=>{clearTimeout(timer);ch.port1.close();resolve(e.data);};worker.postMessage({type:'reminder-version'},[ch.port2]);});if(version==='1.1.0')return registration;}
    if(registration.waiting)registration.waiting.postMessage({type:'activate-reminder-worker'});
    await new Promise(r=>setTimeout(r,150));
  }
  throw Error('La actualización de avisos aún no está lista. Cierra y vuelve a abrir la app.');
}
function workerReady(){if(!readyWorker)readyWorker=checkWorker().catch(e=>{readyWorker=null;throw e;});return readyWorker;}
export function pauseReminders(){paused=true;pending=false;}
async function pushSubscription(reg){let sub=await reg.pushManager.getSubscription();if(!sub){const info=await request('/config');const raw=atob(info.publicKey.replace(/-/g,'+').replace(/_/g,'/'));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}return sub;}
async function flush(){
  if(running)return;running=true;
  try{
    while(pending){if(paused)break;pending=false;await mirror();
      if(config?.pendingDelete){await request('/device','DELETE');config.pendingDelete=false;persist();continue;}
      if(!config?.enabled||disabled)continue;
      if(Notification.permission!=='granted')throw Error('Permite las notificaciones de esta app en los ajustes de Chrome.');
      const registration=await workerReady();const sub=await pushSubscription(registration);
      config.revision=(config.revision||0)+1;persist();
      await request('/device','PUT',{revision:config.revision,subscription:sub.toJSON(),tasks:serverTasks(latest)});
      if(!pending)message('✓ Avisos programados en este teléfono. Sin fecha, no hay aviso.');
    }
  }catch(e){message('Notas guardadas en el teléfono. Avisos pendientes: '+e.message,true);}
  finally{running=false;}
}
export function refreshReminders(tasks){latest=structuredClone(tasks);if(!config?.enabled&&!config?.pendingDelete)return;pending=true;void flush();}
async function received(){try{const last=await db.read('lastNotice');if(last)message('✓ Último aviso recibido aquí: '+new Date(last.at).toLocaleString('es-ES'));}catch{}}
export function initReminders(tasks){
  latest=structuredClone(tasks);load();controls();
  if(!('Notification' in globalThis)||!('PushManager' in globalThis)||!('serviceWorker' in navigator)){$('notify-enable').disabled=true;message('Este navegador no permite avisos. Usa la app en Chrome del teléfono.');return;}
  if(config?.enabled){message('Comprobando recordatorios…');refreshReminders(tasks);}else message('Sin activar. Las tareas se guardan aunque no actives los avisos.');
  $('notify-enable').addEventListener('click',async()=>{
    $('notify-enable').disabled=true;
    try{
      const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('No has concedido permiso. Las tareas siguen funcionando sin avisos.');
      if(!config?.token)config={token:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),revision:0};
      config.enabled=true;config.pendingDelete=false;disabled=false;persist();controls();pending=true;await flush();
    }catch(e){message(e.message,true);}finally{$('notify-enable').disabled=false;}
  });
  $('notify-test').addEventListener('click',async()=>{
    $('notify-test').disabled=true;
    try{pending=true;await flush();if(running)throw Error('Espera a que termine la programación.');const result=await request('/test','POST',{});message('Prueba programada para '+new Date(result.at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})+'. Cierra la app y comprueba si llega.');}catch(e){message('No se ha programado la prueba: '+e.message,true);}finally{$('notify-test').disabled=false;}
  });
  $('notify-disable').addEventListener('click',async()=>{
    disabled=true;config.enabled=false;config.pendingDelete=true;persist();await mirror();controls();pending=true;await flush();if(!config.pendingDelete)message('Avisos desactivados en este teléfono. Tus tareas se conservan.');
  });
  addEventListener('online',()=>{pending=true;void flush();});
  navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='reminder-received')void received();if(e.data?.type==='focus-task'&&e.data.id){const row=Array.from(document.querySelectorAll('.row')).find(r=>r.dataset.taskId===e.data.id);row?.scrollIntoView({block:'center',behavior:'smooth'});}});
}
