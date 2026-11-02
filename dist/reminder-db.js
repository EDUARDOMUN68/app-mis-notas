/* Datos solo de este navegador; compartidos con el receptor sin abrir la app. */
globalThis.notesReminderDB=(()=>{
  function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('mis-notas-reminders',1);r.onupgradeneeded=()=>{r.result.createObjectStore('data');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function read(key){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('data');const r=tx.objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
  async function write(key,value){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
  async function claim(key,release=false){const db=await open();try{return await new Promise((resolve,reject)=>{let claimed=false;const tx=db.transaction('data','readwrite'),store=tx.objectStore('data'),r=store.get('seen');r.onsuccess=()=>{const seen=r.result||[];if(release)store.put(seen.filter(x=>x!==key),'seen');else if(!seen.includes(key)){store.put([...seen,key].slice(-300),'seen');claimed=true;}};tx.oncomplete=()=>resolve(claimed);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
  return {read,write,claim};
})();
