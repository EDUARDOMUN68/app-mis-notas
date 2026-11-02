export const ORIGIN='https://eduardomun68.github.io';
export const APP_URL=ORIGIN+'/app-mis-notas/';
export function validSubscription(s){
  if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2048||!s.keys||!/^[A-Za-z0-9_-]{80,100}$/.test(s.keys.p256dh)||!/^[A-Za-z0-9_-]{20,30}$/.test(s.keys.auth))return false;
  try{const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname);}catch{return false;}
}
export function validPayload(p,now=Date.now()){
  return !!p&&validSubscription(p.subscription)&&Number.isSafeInteger(p.revision)&&p.revision>=0&&Array.isArray(p.tasks)&&p.tasks.length<=200&&new Set(p.tasks.map(t=>t?.id)).size===p.tasks.length&&p.tasks.every(t=>t&&typeof t.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(t.id)&&Number.isSafeInteger(t.at)&&t.at>=now-86400000&&t.at<=now+366*2*86400000);
}
export function reconcile(old,tasks){return tasks.map(t=>{const previous=old.find(o=>o.id===t.id&&o.at===t.at);return {id:t.id,at:t.at,sent:previous?.sent||false,attempts:previous?.attempts||0,retryAt:previous?.retryAt||0};});}
export function nextAlarm(tasks){const times=tasks.filter(t=>!t.sent&&t.attempts<6).map(t=>Math.max(t.at,t.retryAt||0));return times.length?Math.min(...times):null;}
