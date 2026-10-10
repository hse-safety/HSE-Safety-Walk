// Browser-origin bound, non-exportable private/device cache keys. No secrets in exported reports.
const databases=new Map();
export function deviceStore(project,user){
 const name='sw2-private-'+project+'-'+user;
 async function db(){if(!databases.has(name))databases.set(name,new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('secure');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Secure device storage unavailable'));}));return databases.get(name);}
 async function get(key){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('secure').objectStore('secure').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});}
 async function put(key,value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('secure','readwrite');t.objectStore('secure').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});}
 async function remove(key){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('secure','readwrite');t.objectStore('secure').delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});}
 async function entries(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('secure').objectStore('secure').openCursor(),items=[];r.onsuccess=()=>{const c=r.result;if(c){items.push([c.key,c.value]);c.continue()}else resolve(items)};r.onerror=()=>reject(r.error)});}
 async function device(){let value=await get('device');if(value)return value;
  const signing=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  value={id:crypto.randomUUID(),signing,aes,publicJwk:await crypto.subtle.exportKey('jwk',signing.publicKey)};
  const d=await db();try{await new Promise((resolve,reject)=>{const t=d.transaction('secure','readwrite');t.objectStore('secure').add(value,'device');t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}catch{value=await get('device');if(!value)throw Error('Device registration failed')}
  return value;
 }
 async function seal(key,value){const dev=await device(),iv=crypto.getRandomValues(new Uint8Array(12));const clear=new TextEncoder().encode(JSON.stringify(value));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(name+':'+key)},dev.aes,clear);await put(key,{iv,cipher});}
 async function unseal(key){const row=await get(key);if(!row)return null;const dev=await device();const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:new TextEncoder().encode(name+':'+key)},dev.aes,row.cipher);return JSON.parse(new TextDecoder().decode(clear));}
 async function purge(){for(const [key] of await entries())if(key!=='device'&&!String(key).startsWith('pending:'))await remove(key);}
 return {get,put,remove,entries,device,seal,unseal,purge};
}
