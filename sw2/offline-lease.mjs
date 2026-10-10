/* Safety Walk 2.0 offline lease verifier.
 * A lease must be signed by the server. This module has no private signing key.
 * ES256 compact JWS: signature is JOSE/P1363 raw (r||s), 64 bytes.
 */
const b64urlBytes = part => {
 if(typeof part!=='string'||!/^[a-zA-Z0-9_-]+$/.test(part))throw Error('Invalid licence encoding');
 const value=part.replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(value.padEnd(Math.ceil(value.length/4)*4,'='));
 if(btoa(raw).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')!==part)throw Error('Non-canonical licence encoding');
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
const json = bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
export async function verifyOfflineLease(compact,publicJwk,{userId,deviceId,projectRef,devicePublicJwk,now=Date.now(),maxHours=24}={}) {
 if(typeof compact!=='string'||compact.length>6000)throw Error('Invalid offline licence');
 const parts=compact.split('.');
 if(parts.length!==3)throw Error('Invalid offline licence');
 const header=json(b64urlBytes(parts[0])),payload=json(b64urlBytes(parts[1]));
 if(header.alg!=='ES256'||header.typ!=='SW2-OFFLINE-LEASE'||header.crit||header.jku||header.jwk)throw Error('Unsupported licence format');
 if(!publicJwk||publicJwk.kty!=='EC'||publicJwk.crv!=='P-256'||!publicJwk.x||!publicJwk.y)throw Error('Missing trusted signing key');
 const signature=b64urlBytes(parts[2]);
 if(signature.length!==64)throw Error('Invalid licence signature');
 const key=await crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 const input=new TextEncoder().encode(parts[0]+'.'+parts[1]);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signature,input))throw Error('Invalid licence signature');
 const nowSecs=Math.floor(now/1000);
 if(!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||!Number.isSafeInteger(payload.nbf)
    ||payload.exp<=payload.iat||payload.nbf!==payload.iat||!Number.isFinite(maxHours)||maxHours<=0
    ||payload.iat>nowSecs+60||payload.nbf>nowSecs+60||payload.exp<=nowSecs
    ||payload.exp-payload.iat>Math.min(Math.max(maxHours,0),24)*3600
    ||payload.sub!==userId||payload.device_id!==deviceId||payload.project_ref!==projectRef
    ||payload.aud!=='safety-walk-2'||payload.authorized!==true)
   throw Error('Offline licence expired, mismatched, or not approved');
 if(!devicePublicJwk||devicePublicJwk.d||!payload.device_public_key)throw Error('Device binding required');
 const fingerprint=async j=>{const canonical=JSON.stringify({crv:j.crv,kty:j.kty,x:j.x,y:j.y});const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical)));let b='';for(const n of hash)b+=String.fromCharCode(n);return btoa(b).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');};
 if(payload.device_key!==await fingerprint(devicePublicJwk)||payload.device_key!==await fingerprint(payload.device_public_key))throw Error('Device binding mismatch');
 return Object.freeze({userId:payload.sub,deviceId:payload.device_id,devicePublicJwk:payload.device_public_key,expiresAt:payload.exp*1000});
}
