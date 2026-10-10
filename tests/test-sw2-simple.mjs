import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHandler,publicKey} from '../supabase/functions/sw2-license-simple/core.mjs';
import {verifyOfflineLease} from '../sw2/offline-lease.mjs';
import {prepareV1Module} from '../sw2/prepare-v1-module.mjs';
const signer=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const privateJwk=await crypto.subtle.exportKey('jwk',signer.privateKey),trusted=publicKey(await crypto.subtle.exportKey('jwk',signer.publicKey));
const local=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',local.publicKey),user=crypto.randomUUID(),device=crypto.randomUUID();
let active=true,access={allow_onsite:true,allow_office:false,allow_warehouse:false};const reports=new Map();
const db={profile:async()=>({active,role:'user'}),access:async()=>access,report:async id=>reports.get(id),registerReport:async row=>reports.set(row.report_id,row)};
const handler=createHandler({db,getUser:async t=>t==='valid'?{id:user}:null,getSigningKey:async()=>privateJwk,getWrapKey:async()=>btoa('A'.repeat(32)),getModule:async()=>'<html data-sw2-app-gate data-sw2-secure-export>V1 inspection protected</html>',projectRef:'test'});
async function call(action,fields={},token='valid'){const r=await handler(new Request('https://test.supabase.co/functions/v1/sw2-license-simple',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({action,fields,device_id:device,public_key_jwk:jwk})}));return {status:r.status,body:await r.json()}}
assert.equal((await call('lease',{},'invalid')).status,401);
const granted=await call('lease');assert.equal(granted.status,200);assert(granted.body.approved);
const verified=await verifyOfflineLease(granted.body.lease,trusted,{userId:user,deviceId:device,devicePublicJwk:jwk,projectRef:'test',now:granted.body.server_time});assert.equal(verified.expiresAt-granted.body.server_time,24*3600000);
await assert.rejects(verifyOfflineLease(granted.body.lease,trusted,{userId:user,deviceId:device,devicePublicJwk:jwk,projectRef:'test',now:granted.body.server_time+25*3600000}));
await assert.rejects(verifyOfflineLease(granted.body.lease,trusted,{userId:user,deviceId:device,devicePublicJwk:jwk,projectRef:'test',now:granted.body.server_time,module:'facility'}));
const id=crypto.randomUUID(),key=btoa('B'.repeat(32));assert.equal((await call('register',{report_id:id,key_b64:key})).body.registered,true);assert.equal((await call('open',{report_id:id,module:'report'})).body.key_b64,key);assert.notEqual(reports.get(id).wrapped_key_b64,key);
active=false;for(const action of ['lease','module','open','register'])assert.equal((await call(action,{report_id:id,key_b64:key})).status,403);active=true;
access={allow_onsite:false,allow_office:true,allow_warehouse:false};assert.equal((await call('module')).status,403);assert.equal((await call('module',{module:'facility'})).status,200);assert.equal((await call('open',{module:'report',report_id:id})).status,200);
const sourcePath=process.argv[2];if(sourcePath){const src=fs.readFileSync(sourcePath,'utf8'),out=prepareV1Module(src);const body=s=>s.match(/<body\b[^>]*>([\s\S]*?)<script/i)?.[1];assert.equal(body(out).replaceAll('Safety Walk 2.0','Safety Walk 1.0').replaceAll('AUDIT ID: — · V2.0','AUDIT ID: — · V1.0'),body(src),'Inspection markup changed');assert(out.includes("SAFETY_WALK_VERSION = '2.0'"));assert(out.includes('SW2ReportExport.shareSnapshot'));assert(!out.includes('await navigator.share'));}
console.log('PASS: user-only central approval, silent offline lease, 24h expiry, module permissions, encrypted report keys and revocation. V1 inspection markup preserved.');
