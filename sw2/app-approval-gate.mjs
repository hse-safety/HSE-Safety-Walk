// Fail-closed, online-only approval gate for private Safety Walk module.
// It must use the SAME Supabase project/session as the app login.
import { approvalApi } from './auth.mjs';
import { createApprovalController } from './approval-controller.mjs';
const root=document.documentElement;
const style=document.createElement('style');
style.textContent=`html:not(.sw2-approved) body { visibility: hidden !important; } 
html.sw2-denied body { visibility: visible !important; pointer-events: none !important; filter: blur(8px); }`;
document.head.append(style);
const controller=createApprovalController({
 check:async()=>(await approvalApi('status')).approved===true,
 onState:state=>{
  root.classList.toggle('sw2-approved',state==='approved');
  root.classList.toggle('sw2-denied',state==='denied');
  root.dataset.sw2Approval=state;
  const approved=state==='approved';
  // Do not allow module actions while approval is being renewed.
  root.style.pointerEvents=approved?'':'none';
 }
});
void controller.verify();
window.addEventListener('offline',()=>controller.lock('denied'));
window.addEventListener('online',()=>void controller.verify());
window.addEventListener('pageshow',()=>void controller.verify());
window.addEventListener('pagehide',()=>controller.lock('checking'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void controller.verify()});
setInterval(()=>void controller.verify(),30000);
