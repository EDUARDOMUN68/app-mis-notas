export function reminderValue(date,time=''){
  if(!date)return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'09:00'))throw Error('Revisa la fecha y la hora.');
  const [year,month,day]=date.split('-').map(Number),[hour,minute]=(time||'09:00').split(':').map(Number);
  const value=new Date(year,month-1,day,hour,minute);
  if(value.getFullYear()!==year||value.getMonth()!==month-1||value.getDate()!==day||value.getHours()!==hour||value.getMinutes()!==minute)throw Error('La fecha u hora no existe. Elige otra.');
  return {date,time,at:value.getTime()};
}
export function validReminder(r){
  if(r==null)return true;
  if(typeof r!=='object'||typeof r.date!=='string'||typeof r.time!=='string'||!Number.isSafeInteger(r.at)||r.at<=0)return false;
  try{reminderValue(r.date,r.time);return true;}catch{return false;}
}
export function reminderLabel(r){if(!r)return '';return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(r.at));}
export function serverTasks(tasks,now=Date.now()){return tasks.filter(t=>!t.done&&t.reminder&&t.reminder.at>=now-86400000).map(t=>({id:t.id,at:t.reminder.at}));}
