const utf8=new TextEncoder();
export const bytes=b=>Uint8Array.from(atob(b.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export const b64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)};
export const url64=b=>b64(b).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
export const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export function publicKey(j){
 if(!j||j.kty!=='EC'||j.crv!=='P-256'||j.d||!/^[-\w]{43}$/.test(j.x)||!/^[-\w]{43}$/.test(j.y))throw Error('Invalid device key');
 return {kty:'EC',crv:'P-256',x:j.x,y:j.y};
}
export async function thumbprint(j){j=publicKey(j);return url64(new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(JSON.stringify({crv:j.crv,kty:j.kty,x:j.x,y:j.y})))))}
export async function verifyProof(j,message,signature){
 const key=await crypto.subtle.importKey('jwk',publicKey(j),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 const sig=bytes(signature||'');return sig.length===64&&await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,sig,utf8.encode(message));
}
export async function issueLease(privateJwk,{userId,device,projectRef,now=Date.now(),hours=24}){
 const sec=Math.floor(now/1000);const payload={iss:projectRef,aud:'safety-walk-2',sub:userId,device_id:device.device_id,device_key:await thumbprint(device.public_key_jwk),device_public_key:publicKey(device.public_key_jwk),project_ref:projectRef,authorized:true,iat:sec,nbf:sec,exp:sec+Math.min(24,Math.max(1,hours))*3600};
 const header=url64(utf8.encode(JSON.stringify({alg:'ES256',typ:'SW2-OFFLINE-LEASE'}))),body=url64(utf8.encode(JSON.stringify(payload)));
 const key=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,utf8.encode(header+'.'+body)));
 return {lease:header+'.'+body+'.'+url64(sig),expires_at:payload.exp*1000,server_time:sec*1000};
}
export function createHandler({db,getUser,getSigningKey,getWrapKey,getModule,projectRef,origin='https://hse-safety.github.io',now=()=>Date.now()}){
 const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  try{
   const token=/^Bearer (\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
   const user=token&&await getUser(token);if(!user)return reply({error:'Login required'},401);
   const profile=await db.profile(user.id);if(profile?.active!==true)return reply({error:'User not approved'},403);
   if(Number(req.headers.get('content-length')||0)>16000)return reply({error:'Request too large'},413);
   const text=await req.text();if(text.length>16000)return reply({error:'Request too large'},413);
   const body=JSON.parse(text);if(!uuid(body.device_id))return reply({error:'Invalid device'},400);
   if(body.action==='challenge'){
    const challenge=crypto.randomUUID();await db.challenge({challenge,user_id:user.id,device_id:body.device_id,expires_at:new Date(now()+60000).toISOString()});
    return reply({challenge});
   }
   if(!uuid(body.challenge)||typeof body.signature!=='string')return reply({error:'Device proof required'},403);
   const nonce=await db.consume(body.challenge,user.id,body.device_id,now());if(!nonce)return reply({error:'Device challenge expired or used'},403);
   let device=await db.device(body.device_id);
   if(device&&device.user_id!==user.id)return reply({error:'Device belongs to another user'},403);
   const fields=body.fields||{};
   const jwk=device?.public_key_jwk||(body.action==='device-register'?publicKey(fields.public_key_jwk):null);
   if(!jwk||!await verifyProof(jwk,JSON.stringify({challenge:body.challenge,action:body.action,fields}),body.signature))return reply({error:'Device proof invalid'},403);
   if(body.action==='device-register'){
    if(device){if(await thumbprint(jwk)!==await thumbprint(fields.public_key_jwk))return reply({error:'Device key cannot be replaced'},403);return reply({status:device.status,device_id:device.device_id});}
    device=await db.registerDevice({device_id:body.device_id,user_id:user.id,public_key_jwk:publicKey(jwk),status:'pending',label:String(fields.label||'Safety Walk device').slice(0,120)});
    return reply({status:device.status,device_id:device.device_id});
   }
   // User Management administration is independent of whether this device is approved.
   if(body.action==='devices-list'||body.action==='device-approve'||body.action==='device-revoke'){
    if(profile.role!=='admin')return reply({error:'Administrator required'},403);
    if(body.action==='devices-list')return reply({devices:await db.devices()});
    if(!uuid(fields.device_id))return reply({error:'Invalid device'},400);
    const target=await db.device(fields.device_id);if(!target)return reply({error:'Device not found'},404);
    const status=body.action==='device-approve'?'approved':'revoked';await db.setDeviceStatus(fields.device_id,status,user.id,now());
    return reply({updated:true,status});
   }
   if(device?.status!=='approved')return reply({error:device?.status==='revoked'?'Device approval revoked':'Device awaits administrator approval',code:device?.status||'unregistered'},403);
   const access=await db.access(user.id);if(access?.allow_onsite!==true)return reply({error:'On-Site not approved'},403);
   // Recheck after proof verification. Never issue a licence from an earlier profile snapshot.
   const latest=await db.profile(user.id),latestDevice=await db.device(body.device_id),latestAccess=await db.access(user.id);
   if(latest?.active!==true||latestDevice?.status!=='approved'||latestAccess?.allow_onsite!==true)return reply({error:'Approval withdrawn'},403);
   if(body.action==='lease'||body.action==='status'){
    const signed=await issueLease(await getSigningKey(),{userId:user.id,device:latestDevice,projectRef,now:now()});
    await db.touchDevice(body.device_id,now());return reply({approved:true,...signed});
   }
   if(body.action==='module'){
    const html=await getModule();if(typeof html!=='string'||!html.includes('data-sw2-secure-export')||!html.includes('data-sw2-app-gate'))return reply({error:'Protected module unavailable'},503);
    return reply({html});
   }
   if(!uuid(fields.report_id))return reply({error:'Invalid report'},400);
   const material=bytes(await getWrapKey());if(material.length!==32)throw Error('Server encryption unavailable');
   const wrap=await crypto.subtle.importKey('raw',material,'AES-GCM',false,['encrypt','decrypt']);
   if(body.action==='register'){
    const clear=bytes(fields.key_b64||'');if(clear.length!==32)return reply({error:'Invalid report key'},400);
    const nonce=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:utf8.encode(fields.report_id)},wrap,clear));
    const existing=await db.report(fields.report_id);
    if(existing){
     const previous=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(existing.nonce_b64),additionalData:utf8.encode(fields.report_id)},wrap,bytes(existing.wrapped_key_b64));
     if(b64(new Uint8Array(previous))!==b64(clear))return reply({error:'Report key conflict'},409);
    }else await db.registerReport({report_id:fields.report_id,nonce_b64:b64(nonce),wrapped_key_b64:b64(cipher),created_by:user.id});
    return reply({registered:true});
   }
   if(body.action==='open'){
    const report=await db.report(fields.report_id);if(!report)return reply({error:'Report not found or pending synchronisation'},404);
    const clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(report.nonce_b64),additionalData:utf8.encode(fields.report_id)},wrap,bytes(report.wrapped_key_b64)));
    return reply({key_b64:b64(clear)});
   }
   return reply({error:'Unsupported action'},400);
  }catch{return reply({error:'Approval service unavailable'},503);}
 };
}
