import { createHandler,publicKey } from './core.mjs';
import { readDatabaseResponse } from './rest-response.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const secret=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!secret)throw Error('Missing server configuration');
const headers={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
async function rest(path:string,options:RequestInit={}){
 const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}});
 return readDatabaseResponse(r);
}
const one=async(path:string)=>(await rest(path))?.[0]||null;
const db:any={
 profile:(id:string)=>one('profiles?select=active,role&id=eq.'+id),
 access:(id:string)=>one('safety_access?select=allow_onsite&user_id=eq.'+id),
 device:(id:string)=>one('sw2_devices?select=*&device_id=eq.'+id),
 devices:async()=>{const rows=await rest('sw2_devices?select=device_id,user_id,status,label,created_at,approved_at,last_seen_at&order=created_at.desc');const profiles=await rest('profiles?select=id,email,display_name');const names=new Map(profiles.map((p:any)=>[p.id,p.display_name||p.email]));return rows.map((d:any)=>({...d,user_name:names.get(d.user_id)||'Safety Walk user'}));},
 challenge:(row:unknown)=>rest('sw2_device_challenges',{method:'POST',body:JSON.stringify(row),headers:{Prefer:'return=minimal'}}),
 consume:async(c:string,u:string,d:string,t:number)=>null,
 registerDevice:async(row:unknown)=>(await rest('sw2_devices',{method:'POST',body:JSON.stringify(row),headers:{Prefer:'return=representation'}}))[0],
 setDeviceStatus:(id:string,status:string,admin:string,t:number)=>rest('sw2_devices?device_id=eq.'+id,{method:'PATCH',body:JSON.stringify({status,approved_by:admin,approved_at:status==='approved'?new Date(t).toISOString():null}),headers:{Prefer:'return=minimal'}}),
 touchDevice:(id:string,t:number)=>rest('sw2_devices?device_id=eq.'+id,{method:'PATCH',body:JSON.stringify({last_seen_at:new Date(t).toISOString()}),headers:{Prefer:'return=minimal'}}),
 report:(id:string)=>one('sw2_report_keys?select=*&report_id=eq.'+id),
 registerReport:(row:unknown)=>rest('sw2_report_keys',{method:'POST',body:JSON.stringify(row),headers:{Prefer:'return=minimal'}})
};
// DELETE ... RETURNING atomically consumes the challenge; concurrent replay fails.
db.consume=async(c,u,d,t)=>(await rest('sw2_device_challenges?challenge=eq.'+c+'&user_id=eq.'+u+'&device_id=eq.'+d+'&expires_at=gt.'+encodeURIComponent(new Date(t).toISOString()),{method:'DELETE',headers:{Prefer:'return=representation'}}))?.[0]||null;
async function getSigningKey(){
 let jwk=await rest('rpc/sw2_signing_material',{method:'POST',body:'{}'});
 if(!jwk){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const candidate=await crypto.subtle.exportKey('jwk',pair.privateKey);jwk=await rest('rpc/sw2_signing_material',{method:'POST',body:JSON.stringify({candidate})});}
 return jwk;
}
const handler=createHandler({db,projectRef:new URL(url).hostname.split('.')[0],
 getUser:async(token:string)=>{const r=await fetch(url+'/auth/v1/user',{headers:{apikey:secret,Authorization:'Bearer '+token}});return r.ok?await r.json():null;},
 getSigningKey,
 getWrapKey:()=>rest('rpc/sw2_internal_wrap_key',{method:'POST',body:'{}'}),
 getModule:async()=>{const r=await fetch(url+'/storage/v1/object/authenticated/safety-modules/onsite-v2.0.html',{headers});return r.ok?await r.text():null;}
});
Deno.serve(async req=>{
 // The only anonymous operation exposes the PUBLIC licence verification key.
 if(req.method==='GET'&&new URL(req.url).searchParams.get('action')==='public-key'){
  const jwk=await getSigningKey();return new Response(JSON.stringify({public_key:publicKey({kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y})}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://hse-safety.github.io','Cache-Control':'no-store'}});
 }
 return handler(req);
});
