// Prepare protection before the SEND gesture; Safari share() needs the live tap.
import { encryptHtml, buildCarrierHtml } from './report-core.mjs';
import { approvalApi } from './auth.mjs';
import { REPORT_VIEWER_URL } from './config.mjs';
import { onApprovalChange } from './licensing.mjs';
export async function protectSnapshot(clearHtml) {
 const {package:encrypted,key}=await encryptHtml(clearHtml);
 await approvalApi('register',{report_id:encrypted.id,key_b64:key});
 return buildCarrierHtml(encrypted,REPORT_VIEWER_URL);
}
let prepared=null,job=null,dirty=true,generation=0,debounce,observer,sharing=false,interacting=false;
const canonical=html=>html.replace(/data-audit-storage-key="[^"]*"/g,'data-audit-storage-key="snapshot"');
function snapshot(build){observer?.disconnect();try{return build()}finally{observe()}}
function observe(){if(observer&&document.body)observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','checked','value','selected'],characterData:true});}
function preparationState(busy){const b=window.__SW2_SEND_BUTTON;if(!b||sharing||interacting)return;b.disabled=busy;b.textContent=busy?'Preparing…':'SEND';}
function invalidate(event){if(event?.type==='change'&&prepared&&window.__SW2_SNAPSHOT&&canonical(snapshot(window.__SW2_SNAPSHOT))===prepared.fingerprint){dirty=false;clearTimeout(debounce);preparationState(false);return;}preparationState(true);generation++;dirty=true;clearTimeout(debounce);debounce=setTimeout(()=>void prepare().catch(()=>{}),180);}
async function prepare(build=window.__SW2_SNAPSHOT,name=window.__SW2_FILENAME) {
 if(!build||!name||!document.documentElement.classList.contains('sw2-approved'))return null;
 if(job)return job;
 const ticket=generation;
 job=(async()=>{const clear=snapshot(build),fingerprint=canonical(clear),carrier=await protectSnapshot(clear);
  if(ticket!==generation)return null;
  const filename=name();let file=new File([carrier],filename,{type:'text/html'});
  if(navigator.canShare&&!navigator.canShare({files:[file]}))file=new File([carrier],filename,{type:'application/octet-stream'});
  prepared={fingerprint,carrier,filename,file};dirty=false;preparationState(false);return prepared;
 })().catch(e=>{preparationState(false);throw e;}).finally(()=>{job=null;if(dirty&&ticket!==generation){clearTimeout(debounce);debounce=setTimeout(()=>void prepare().catch(()=>{}),180)}});
 return job;
}
function download(item){const url=URL.createObjectURL(new Blob([item.carrier],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download=item.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);}
export function shareSnapshot(build,name,button){
 if(!document.documentElement.classList.contains('sw2-approved'))return;
 // No await, fetch or encryption may precede this call to navigator.share().
 const current=canonical(snapshot(build));
 if(!prepared||prepared.fingerprint!==current){
  invalidate();button.disabled=true;const label=button.textContent;button.textContent='Preparing…';
  return (async()=>{try{const ready=await prepare(build,name);if(ready)alert('The protected report is ready. Tap SEND to open Mail or AirDrop.');else alert('The report is still being prepared. Please try SEND again.');}catch(e){alert('The protected report could not be prepared: '+e.message)}finally{button.disabled=false;button.textContent=label}})();
 }
 const item=prepared;
 if(typeof navigator.share!=='function'||(navigator.canShare&&!navigator.canShare({files:[item.file]}))){download(item);alert('The protected HTML file has been downloaded. Share it from Files.');return;}
 const label=button.textContent;
 let result;
 try{result=navigator.share({title:'HSE Safety Walk',files:[item.file]});}catch(e){result=Promise.reject(e);}
 sharing=true;button.disabled=true;button.textContent='Choose…';
 return Promise.resolve(result).catch(error=>{if(error?.name==='AbortError')return;download(item);alert('The protected HTML file has been downloaded. Share it from Files.');}).finally(()=>{sharing=false;button.disabled=false;button.textContent=label;preparationState(dirty);});
}
window.SW2ReportExport=Object.freeze({protectSnapshot,shareSnapshot});
onApprovalChange(({approved})=>{if(approved&&dirty){clearTimeout(debounce);debounce=setTimeout(()=>void prepare().catch(()=>{}),50)}else if(!approved){generation++;prepared=null;dirty=true;}});
function install(){
 document.addEventListener('pointerdown',event=>{const button=window.__SW2_SEND_BUTTON;if(button&&(event.target===button||button.contains(event.target)))interacting=true;},true);
 for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>setTimeout(()=>{interacting=false;preparationState(dirty)},0),true);
 observer=new MutationObserver(changes=>{const button=window.__SW2_SEND_BUTTON;if(changes.some(m=>!button||!(m.target===button||button.contains(m.target))))invalidate()});observe();
 for(const event of ['input','change'])document.addEventListener(event,invalidate,true);
 invalidate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
