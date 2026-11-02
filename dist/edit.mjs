export function bindTaskEditor(row,task,openEditor){
  let timer,startX,startY,ignoreClickUntil=0;
  const cancel=()=>{clearTimeout(timer);timer=null;};
  const edit=()=>{cancel();ignoreClickUntil=Date.now()+1200;openEditor(task);};
  row.title='Mantén pulsado para editar. Con teclado, pulsa F2.';
  row.addEventListener('pointerdown',e=>{cancel();if(!e.isPrimary||e.button!==0)return;startX=e.clientX;startY=e.clientY;timer=setTimeout(edit,600);});
  row.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>10)cancel();});
  for(const name of ['pointerup','pointercancel','pointerleave'])row.addEventListener(name,cancel);
  row.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  row.addEventListener('contextmenu',e=>{e.preventDefault();edit();});
  row.addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();edit();}});
}
