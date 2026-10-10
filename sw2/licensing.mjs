import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,LICENSE_PUBLIC_KEY,LICENSE_ENDPOINT} from './config.mjs';
import {verifyOfflineLease} from './offline-lease.mjs';
import {deviceStore} from './device-store.mjs';
const project=new URL(SUPABASE_URL).hostname.split('.')[0],encoder=new TextEncoder();
let selectedModule=location.pathname.includes('report-viewer')?'report':'onsite';
export function selectModule(module){if(!['onsite','facility','report'].includes(module))throw Error('Invalid module');selectedModule=module;window.__SW2_MODULE=module;if(module!=='report')localStorage.setItem('sw2-last-module',module);}
const activeModule=()=>window.__SW2_MODULE||selectedModule;
let context,serial=Promise.resolve(),epoch=0;const listeners=new Set();
const b64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')};
export const onApprovalChange=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
function emit(approved,message=''){for(const fn of listeners)fn({approved,message})}
function session(){const raw=localStorage.getItem('sb-'+project+'-auth-token');if(!raw)return null;try{const s=JSON.parse(raw);return s.currentSession||s;}catch{return null}}
async function state(){const s=session();if(!s?.user?.id)throw Error('Login required');if(!context||context.user!==s.user.id){context={user:s.user.id,store:deviceStore(project,s.user.id),lease:null,anchor:null};}return {...context,session:s};}
async function call(action,fields={}){
 if(navigator.onLine===false)throw Error('Internet connection required');
 const ctx=await state(),device=await ctx.store.device();
 // Refresh only online. Offline approval uses the signed lease, never an expired JWT.
 const {sw2Client,sessionMatchesProject}=await import('./auth.mjs');
 const {data:{session:current},error:sessionError}=await sw2Client.auth.getSession();
 const jwt=current?.access_token;if(sessionError||current?.user?.id!==ctx.user||!jwt||!sessionMatchesProject(current,SUPABASE_URL))throw Error('Login required');
 const headers={apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
 async function request(body){const r=await fetch(LICENSE_ENDPOINT,{method:'POST',cache:'no-store',headers,body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok){const err=Error(data.error||'Approval unavailable');err.status=r.status;throw err;}return data;}
 return request({action,fields:{...fields,module:activeModule()},device_id:device.id,public_key_jwk:device.publicJwk});
}
export async function registerDevice(){return {status:'approved'};}
async function effectiveTime(ctx){const saved=await ctx.store.get('lease'),clock=await ctx.store.get('clock');if(!saved)throw Error('Offline licence required');
 const wall=Date.now();if(clock&&wall<clock.wall-60000)throw Error('Device clock changed; reconnect to renew approval');
 const offset=saved.serverTime-saved.wall;const mono=ctx.anchor?ctx.anchor.serverTime+(performance.now()-ctx.anchor.mono):0;
 const now=Math.max(wall+offset,clock?.trusted||0,mono);await ctx.store.put('clock',{wall,trusted:now});return {saved,now};
}
async function trustedKey(ctx,online=false){
 if(LICENSE_PUBLIC_KEY)return LICENSE_PUBLIC_KEY;
 if(!online){const key=await ctx.store.unseal('signing-key');if(!key)throw Error('Renew the licence online once');return key;}
 const response=await fetch(LICENSE_ENDPOINT+'?action=public-key',{cache:'no-store'});
 if(!response.ok)throw Error('Licence verification key unavailable');
 const {public_key:key}=await response.json();
 if(!key||key.d||key.kty!=='EC'||key.crv!=='P-256')throw Error('Invalid licence verification key');
 return key;
}
async function offlineApproval(){const ctx=await state(),dev=await ctx.store.device(),{saved,now}=await effectiveTime(ctx);
 const lease=await verifyOfflineLease(saved.compact,await trustedKey(ctx),{userId:ctx.user,deviceId:dev.id,projectRef:project,devicePublicJwk:dev.publicJwk,now,module:activeModule()});
 // Demonstrate possession of the browser-bound private key for this lease.
 const key=await crypto.subtle.importKey('jwk',lease.devicePublicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 const nonce=crypto.getRandomValues(new Uint8Array(32)),proof=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},dev.signing.privateKey,nonce);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,proof,nonce))throw Error('Offline device mismatch');
 return {approved:true,offline:true,modules:lease.modules,expires_at:lease.expiresAt,server_time:now};
}
export async function requireApproval({renew=false}={}){
 const ticket=epoch;
 if(navigator.onLine===false){try{const result=await offlineApproval();if(ticket!==epoch)throw Error('Approval superseded');emit(true);return result;}catch(e){emit(false,e.message);throw e;}}
 return serial=serial.catch(()=>{}).then(async()=>{
  if(ticket!==epoch)throw Error('Approval superseded');
  const ctx=await state();try{
   // Online checks always reach the server; caching is exclusively for offline operation.
   const data=await call('lease');const dev=await ctx.store.device();
   const trusted=await trustedKey(ctx,true);
   await verifyOfflineLease(data.lease,trusted,{userId:ctx.user,deviceId:dev.id,projectRef:project,devicePublicJwk:dev.publicJwk,now:data.server_time,module:activeModule()});
   if(ticket!==epoch)throw Error('Approval superseded');
   await ctx.store.seal('signing-key',trusted);
   await ctx.store.put('lease',{compact:data.lease,serverTime:data.server_time,wall:Date.now()});
   context.anchor={serverTime:data.server_time,mono:performance.now()};await ctx.store.put('clock',{wall:Date.now(),trusted:data.server_time});
   const original=window.__HSE_SW_IDENTITY?.access;
   if(activeModule()==='facility'&&original&&(data.modules?.office!==original.office||data.modules?.warehouse!==original.warehouse))throw Error('Facility approval changed. Close and reopen Safety Walk.');
   await flushPending();if(ticket!==epoch)throw Error('Approval superseded');emit(true);return data;
  }catch(e){if(e.status===401||e.status===403)await ctx.store.purge();else await ctx.store.remove('lease');emit(false,e.message);throw e;}
 });
}
export async function licenceApi(action,fields={}){
 if(action==='status')return requireApproval();
 if(navigator.onLine===false)await requireApproval();const ctx=await state();
 if(action==='register'){
  await ctx.store.seal('report:'+fields.report_id,{key_b64:fields.key_b64});
  if(navigator.onLine===false){await ctx.store.seal('pending:'+fields.report_id,fields);return {registered:true,pending:true};}
  try{return await call('register',fields)}catch(e){if(e.status===401||e.status===403){await ctx.store.purge();emit(false,e.message)}throw e;}
 }
 if(action==='open'){
  if(navigator.onLine===false){const key=await ctx.store.unseal('report:'+fields.report_id);if(!key)throw Error('This report needs one online opening on this approved device');return key;}
  try{const result=await call('open',fields);await ctx.store.seal('report:'+fields.report_id,result);return result;}catch(e){if(e.status===401||e.status===403){await ctx.store.purge();emit(false,e.message)}throw e;}
 }
 throw Error('Unsupported report operation');
}
async function flushPending(){const ctx=await state();for(const [key]of await ctx.store.entries())if(String(key).startsWith('pending:')){const fields=await ctx.store.unseal(key);await call('register',fields);await ctx.store.remove(key);}}
export async function loadPrivateApp(module='onsite'){selectModule(module);await requireApproval();const ctx=await state(),cache='app:'+module;if(navigator.onLine===false){const html=await ctx.store.unseal(cache);if(!html)throw Error('Open this module online once before offline use');return html;}const {html}=await call('module');if(typeof html!=='string')throw Error('Protected app unavailable');await ctx.store.seal(cache,html);return html;}
export async function forgetApproval(){epoch++;if(context)await context.store.purge();emit(false,'Logged out');}
export async function adminDevices(action,fields={}){await registerDevice();return call(action,fields);}
export function invalidateApproval(){epoch++;emit(false,'Checking current approval');}
window.addEventListener('online',()=>{invalidateApproval();void requireApproval({renew:true}).catch(()=>{})});
window.addEventListener('offline',()=>{invalidateApproval();void requireApproval().catch(()=>{})});

export async function rememberIdentity(identity){await requireApproval();const ctx=await state();await ctx.store.seal('identity',identity);}
export async function offlineIdentity(){await requireApproval();const ctx=await state();const value=await ctx.store.unseal('identity');if(!value)throw Error('Open the app online once before offline use');return value;}
