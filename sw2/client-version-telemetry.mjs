export const CLIENT_VERSION='2.0';
export function deviceLabel(){
 const ua=navigator.userAgent||'';
 if(/iPhone/i.test(ua))return 'iPhone';
 if(/iPad/i.test(ua))return 'iPad';
 if(/Android/i.test(ua))return 'Android';
 if(/Windows/i.test(ua))return 'Windows';
 if(/Mac/i.test(ua))return 'Mac';
 return 'Other';
}
export async function logClientVersion(client,event,module=null){
 try{
  await client.rpc('sw2_record_client_version',{
   p_event:event,p_version:CLIENT_VERSION,p_device:deviceLabel(),p_module:module
  });
 }catch(error){console.warn('Version reporting unavailable',error);}
}
