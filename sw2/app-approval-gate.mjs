import {requireApproval,onApprovalChange,invalidateApproval} from './licensing.mjs';
const root=document.documentElement,style=document.createElement('style');
style.dataset.sw2AppGate='';
style.textContent=`html:not(.sw2-approved) body{visibility:hidden!important}html:not(.sw2-approved)::after{content:'Safety Walk 2.0 – approval required';position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#f4f6f7;color:#173048;font:600 18px system-ui;text-align:center;padding:24px}html.sw2-denied::after{content:attr(data-sw2-message)}`;
document.head.append(style);
function set({approved,message}){root.classList.toggle('sw2-approved',approved);root.classList.toggle('sw2-denied',!approved&&!!message);root.dataset.sw2Approval=approved?'approved':'denied';root.dataset.sw2Message=message||'Approval required';root.style.pointerEvents=approved?'':'none';document.body?.setAttribute('aria-busy',String(!approved));if(document.body)document.body.inert=!approved;}
onApprovalChange(set);set({approved:false});
let expiryTimer;
async function verify(){try{const lease=await requireApproval();clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{invalidateApproval();void verify()},Math.max(0,lease.expires_at-lease.server_time));}catch(e){set({approved:false,message:e.message})}}
window.addEventListener('pagehide',()=>{invalidateApproval();set({approved:false})});
window.addEventListener('pageshow',()=>void verify());
document.addEventListener('visibilitychange',()=>{if(!document.hidden){invalidateApproval();void verify()}});
setInterval(()=>void verify(),30000);
// Block keyboard edits, print shortcuts and programmatic button events while the lease is unavailable.
for(const event of ['click','beforeinput','keydown','submit','paste','drop'])document.addEventListener(event,e=>{if(!root.classList.contains('sw2-approved')){e.preventDefault();e.stopImmediatePropagation()}},true);
void verify();
