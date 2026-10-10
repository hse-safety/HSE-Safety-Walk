import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb=createClient('https://hvgljbyethfwxajnrvvi.supabase.co','sb_publishable_pMvJE0yUfBC9KhPl43WGrQ_dUCERa3c');
const api='https://hvgljbyethfwxajnrvvi.supabase.co/functions/v1/sw2-premises-preview?check=1';
const root=document.documentElement;
let checking=false;
function state(ok){
 root.classList.toggle('sw2-premises-approved',ok);
 root.classList.toggle('sw2-premises-denied',!ok);
 root.style.pointerEvents=ok?'':'none';
}
state(false);
async function verify(){
 if(checking)return;
 checking=true;
 try{
  if(!navigator.onLine)throw Error('Offline verification required');
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Missing session');
  const response=await fetch(api,{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  if(!response.ok)throw Error('Access denied');
  const result=await response.json();
  if(result.approved!==true)throw Error('Not approved');
  const original=window.__HSE_SW_IDENTITY?.access;
  if(!original||result.access?.office!==original.office||result.access?.warehouse!==original.warehouse)throw Error('Permissions changed');
  state(true);
 }catch{state(false)}
 finally{checking=false}
}
void verify();
window.addEventListener('offline',()=>state(false));
window.addEventListener('online',()=>void verify());
window.addEventListener('pageshow',()=>void verify());
window.addEventListener('pagehide',()=>state(false));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void verify()});
setInterval(()=>void verify(),15000);