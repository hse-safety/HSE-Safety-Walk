import assert from 'node:assert/strict';
import {createHandler,issueLease,publicKey,url64} from '../supabase/functions/sw2-license/core.mjs';
import {verifyOfflineLease} from '../sw2/offline-lease.mjs';
const enc=new TextEncoder(),now=Date.now();
const userId=crypto.randomUUID(),adminId=crypto.randomUUID(),deviceId=crypto.randomUUID();
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const deviceJwk=publicKey(await crypto.subtle.exportKey('jwk',pair.publicKey));
const signing=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const signingPrivate=await crypto.subtle.exportKey('jwk',signing.privateKey),signingPublic=publicKey(await crypto.subtle.exportKey('jwk',signing.publicKey));
let active=true,allowed=true,currentUser=userId;const devices=new Map(),nonces=new Map(),reports=new Map();
const db={profile:async id=>({active,role:id===adminId?'admin':'user'}),access:async()=>({allow_onsite:allowed}),device:async id=>devices.get(id),devices:async()=>[...devices.values()],challenge:async row=>nonces.set(row.challenge,row),consume:async(c,u,d,t)=>{const n=nonces.get(c);nonces.delete(c);return n&&n.user_id===u&&n.device_id===d&&Date.parse(n.expires_at)>t?n:null;},registerDevice:async row=>{devices.set(row.device_id,row);return row},setDeviceStatus:async(id,status)=>{devices.get(id).status=status},touchDevice:async()=>{},report:async id=>reports.get(id),registerReport:async row=>reports.set(row.report_id,row)};
const handler=createHandler({db,getUser:async token=>token==='valid'?{id:currentUser}:null,getSigningKey:async()=>signingPrivate,getWrapKey:async()=>btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),getModule:async()=>'<html data-sw2-app-gate data-sw2-secure-export></html>',projectRef:'test',now:()=>now});
async function raw(body,token='valid'){const r=await handler(new Request('https://test/license',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()}}
async function signed(action,fields={},id=deviceId,key=pair){const {body:{challenge}}=await raw({action:'challenge',device_id:id});const signature=url64(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,enc.encode(JSON.stringify({challenge,action,fields})))));return {action,fields,device_id:id,challenge,signature}}
async function call(action,fields={}){return raw(await signed(action,fields))}
assert.equal((await raw({action:'challenge',device_id:deviceId},'invalid')).status,401);
assert.equal((await call('device-register',{public_key_jwk:deviceJwk})).body.status,'pending');
assert.equal((await call('lease')).status,403);
assert.equal((await call('device-approve',{device_id:deviceId})).status,403);
devices.get(deviceId).status='approved';
const approved=await call('lease');assert.equal(approved.status,200);assert.equal(approved.body.approved,true);
const opts={userId,deviceId,projectRef:'test',devicePublicJwk:deviceJwk,now};
const verified=await verifyOfflineLease(approved.body.lease,signingPublic,opts);assert.equal(verified.expiresAt,Math.floor(now/1000)*1000+24*3600000);
await assert.rejects(()=>verifyOfflineLease(approved.body.lease,signingPublic,{...opts,now:verified.expiresAt}));
await assert.rejects(()=>verifyOfflineLease(approved.body.lease,signingPublic,{...opts,userId:adminId}));
await assert.rejects(()=>verifyOfflineLease(approved.body.lease,signingPublic,{...opts,deviceId:crypto.randomUUID()}));
const other=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const otherJwk=publicKey(await crypto.subtle.exportKey('jwk',other.publicKey));
await assert.rejects(()=>verifyOfflineLease(approved.body.lease,signingPublic,{...opts,devicePublicJwk:otherJwk}));
await assert.rejects(()=>verifyOfflineLease(approved.body.lease.replace(/.$/,c=>c==='A'?'B':'A'),signingPublic,opts));
const replay=await signed('lease');assert.equal((await raw(replay)).status,200);assert.equal((await raw(replay)).status,403);
const tamper=await signed('module');tamper.action='lease';assert.equal((await raw(tamper)).status,403);
const bad=await signed('lease',{},deviceId,other);assert.equal((await raw(bad)).status,403);
active=false;assert.equal((await call('lease')).status,403);active=true;allowed=false;assert.equal((await call('open',{report_id:crypto.randomUUID()})).status,403);allowed=true;
const id=crypto.randomUUID(),key_b64=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
assert.equal((await call('register',{report_id:id,key_b64})).status,200);assert.equal((await call('register',{report_id:id,key_b64})).status,200);assert.equal((await call('open',{report_id:id})).body.key_b64,key_b64);
assert.equal((await call('register',{report_id:id,key_b64:btoa('A'.repeat(32))})).status,409);
devices.get(deviceId).status='revoked';assert.equal((await call('lease')).status,403);assert.equal((await call('open',{report_id:id})).status,403);
// An administrator still must demonstrate possession of a registered device key.
currentUser=adminId;const adminDevice=crypto.randomUUID();const registration=await raw(await signed('device-register',{public_key_jwk:deviceJwk},adminDevice));assert.equal(registration.status,200);
const adminProof=await signed('device-approve',{device_id:deviceId},adminDevice);assert.equal((await raw(adminProof)).status,200);assert.equal(devices.get(deviceId).status,'approved');
console.log('PASS: signed 24-hour expiry, user/device/key binding, tamper/replay, pending/revoked/inactive denial, admin approval, encrypted report key registration and reopening.');
