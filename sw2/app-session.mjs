// The app uses its normal Supabase login. Reports have no licence or encryption.
import {sw2Client} from './client.mjs';
import {SUPABASE_URL} from './config.mjs';
const project=new URL(SUPABASE_URL).hostname.split('.')[0];
let selectedModule='onsite',database;
function savedSession(){try{const value=JSON.parse(localStorage.getItem('sb-'+project+'-auth-token')||'null');return value?.currentSession||value;}catch{return null;}}
function userId(){
 const id=savedSession()?.user?.id;
 if(!id)throw Error('Login required. Log in to the app online first');
 return id;
}
function db(){return database||=(new Promise((resolve,reject)=>{const r=indexedDB.open('safety-walk-app-cache-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('modules');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
async function get(key){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('modules').objectStore('modules').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function put(key,value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('modules','readwrite');t.objectStore('modules').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
export function selectModule(module){if(!['onsite','facility'].includes(module))throw Error('Invalid module');selectedModule=module;localStorage.setItem('sw2-last-module',module);}
function allowed(identity,module){return identity?.role==='admin'||(module==='onsite'?identity?.access?.onsite:identity?.access?.office||identity?.access?.warehouse);}
async function downloadModule(module){
 let timeout;try{
  const result=await Promise.race([sw2Client.storage.from('safety-modules').download(module==='facility'?'kvi-premises-v1.0.html':'onsite-v1.0.html'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Connection unavailable')),8000);})]);
  if(result.error)throw result.error;
  const html=await result.data.text();if(!html.includes('function buildStandaloneHtmlSnapshot()'))throw Error('Inspection template unavailable');return html;
 }finally{clearTimeout(timeout);}
}
export async function loadPrivateApp(module='onsite',identity=null){
 selectModule(module);const user=userId(),key=user+':'+module;
 if(identity&&identity.userId!==user)throw Error('Login changed. Reopen the app.');
 if(!identity)identity=await get(user+':identity');
 if(!allowed(identity,module))throw Error('No access to this inspection module');
 const cached=await get(key).catch(()=>null);
 if(cached)return cached;
 if(navigator.onLine===false)throw Error('Open this module online once before offline use');
 try{const html=await downloadModule(module);try{await put(key,html);await put(user+':identity',identity);}catch(error){console.warn('Offline app cache unavailable',error);}return html;}
 catch(error){if([401,403].includes(Number(error.status||error.statusCode)))throw error;const cached=await get(key);if(cached)return cached;throw error;}
}
export async function prepareOfflineAccess(identity){
 const user=userId();if(identity?.userId!==user)throw Error('Login changed');
 await put(user+':identity',identity);
 const modules=['onsite','facility'].filter(m=>allowed(identity,m));
 await Promise.all(modules.map(async module=>{await put(user+':'+module,await downloadModule(module));}));
 return {ready:modules.length>0};
}
export async function offlineIdentity(){
 const user=userId(),identity=await get(user+':identity');
 if(!identity)throw Error('Log in online once before offline use');return identity;
}
// Logging out removes the app session; inspection drafts are kept in their own DB.
export async function forgetApproval(){}
