export const CLIENT_VERSION='2.0';
export function deviceLabel(){
 const ua=navigator.userAgent||'';
 if(/iPhone/i.test(ua))return 'iPhone';
 if(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))return 'iPad';
 if(/Android/i.test(ua))return 'Android';
 if(/Windows/i.test(ua))return 'Windows';
 if(/Mac/i.test(ua))return 'Mac';
 return 'Other';
}
const QUEUE='sw2-pending-version-events';
function pending(){
 try{return JSON.parse(localStorage.getItem(QUEUE)||'[]').slice(-30)}catch{return []}
}
let working=Promise.resolve();
export function logClientVersion(client,event,module=null,userId=null){
 if(!userId)return;
 const item={userId,event,module,version:CLIENT_VERSION,device:deviceLabel(),at:new Date().toISOString()};
 try{localStorage.setItem(QUEUE,JSON.stringify([...pending(),item].slice(-30)))}catch{}
 void flushClientVersions(client,userId);
}
export function flushClientVersions(client,userId){
 if(!userId||navigator.onLine===false)return Promise.resolve();
 working=working.catch(()=>{}).then(async()=>{
  const queue=pending(),sent=new Set();
  for(let i=0;i<queue.length;i++){
   const item=queue[i];
   if(item.userId!==userId)continue;
   try{
    const {error}=await client.rpc('sw2_record_client_version',{
     p_event:item.event,p_version:item.version,p_device:item.device,
     p_module:item.module,p_occurred_at:item.at
    });
    if(error)throw error;
    sent.add(JSON.stringify(item));
   }catch(error){break;}
  }
  try{localStorage.setItem(QUEUE,JSON.stringify(pending().filter(item=>!sent.has(JSON.stringify(item))).slice(-30)))}catch{}
 }).catch(()=>{});
 return working;
}
