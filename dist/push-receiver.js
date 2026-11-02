const RECEIVER_VERSION='1.1.0';
self.addEventListener('message',e=>{if(e.data?.type==='reminder-version')e.ports[0]?.postMessage(RECEIVER_VERSION);if(e.data?.type==='activate-reminder-worker')self.skipWaiting();});
self.addEventListener('push',e=>{e.waitUntil((async()=>{
  let notice;try{notice=e.data.json();}catch{return;}
  if(!['task','test'].includes(notice.kind)||typeof notice.key!=='string')return;
  const db=globalThis.notesReminderDB,mirror=await db.read('mirror');if(!mirror?.enabled)return;
  const task=notice.kind==='task'?mirror.tasks.find(t=>t.id===notice.id&&!t.done&&t.reminder?.at===notice.at):null;
  if(notice.kind==='task'&&(!task||Date.now()-notice.at>86400000))return;
  if(!await db.claim(notice.key))return;
  try{
  await self.registration.showNotification('Mis notas',{body:task?task.text:'Prueba de aviso: los recordatorios llegan a este teléfono.',icon:new URL('icon-192.png',self.registration.scope).href,badge:new URL('icon-192.png',self.registration.scope).href,tag:'mis-notas-'+notice.key,data:{taskId:task?.id||null},timestamp:notice.at});
  }catch(error){await db.claim(notice.key,true);throw error;}
  await db.write('lastNotice',{at:Date.now(),kind:notice.kind});
  for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'reminder-received'});
})());});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=windows.find(c=>c.url.startsWith(self.registration.scope));if(client){await client.focus();client.postMessage({type:'focus-task',id:e.notification.data?.taskId});}else await self.clients.openWindow(self.registration.scope);
})());});
