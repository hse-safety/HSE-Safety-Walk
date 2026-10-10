const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const {createHandler,publicKey}=await import('../supabase/functions/sw2-license/core.mjs');
 const signing=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const privateJwk=await crypto.subtle.exportKey('jwk',signing.privateKey),publicJwk=publicKey(await crypto.subtle.exportKey('jwk',signing.publicKey));
 const user=crypto.randomUUID(),devices=new Map(),challenges=new Map(),reports=new Map();let active=true;
 const db={profile:async()=>({active,role:'user'}),access:async()=>({allow_onsite:true}),device:async id=>devices.get(id),devices:async()=>[...devices.values()],challenge:async r=>challenges.set(r.challenge,r),consume:async(c,u,d,t)=>{const r=challenges.get(c);challenges.delete(c);return r&&r.user_id===u&&r.device_id===d&&Date.parse(r.expires_at)>t?r:null},registerDevice:async r=>{devices.set(r.device_id,r);return r},touchDevice:async()=>{},report:async id=>reports.get(id),registerReport:async r=>reports.set(r.report_id,r)};
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><body>Licence integration</body></html>')};const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()};res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':'text/html');res.end(fs.readFileSync(file))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const handler=createHandler({db,getUser:async t=>t==='valid'?{id:user}:null,getSigningKey:async()=>privateJwk,getWrapKey:async()=>btoa('A'.repeat(32)),getModule:async()=>'<html data-sw2-app-gate data-sw2-secure-export>Private inspection module</html>',projectRef:'test',origin:base});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const context=await browser.newContext();const page=await context.newPage();
 await page.route('**/sw2/config.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const SUPABASE_URL='https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY='public',LICENSE_ENDPOINT='https://test.supabase.co/functions/v1/sw2-license',LICENSE_PUBLIC_KEY=${JSON.stringify(publicJwk)};`}));
 await page.route('**/sw2/auth.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export function sessionMatchesProject(){return true};export const sw2Client={auth:{getSession:async()=>({data:{session:JSON.parse(localStorage.getItem('sb-test-auth-token'))}})}};`}));
 await page.route('https://test.supabase.co/**',async route=>{const req=route.request();if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':base,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});const r=await handler(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()}));await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()})});
 await page.goto(base);await page.evaluate(u=>localStorage.setItem('sb-test-auth-token',JSON.stringify({access_token:'valid',user:{id:u}})),user);
 let denied=await page.evaluate(async()=>{try{await(await import('/sw2/licensing.mjs')).requireApproval();return false}catch(e){return /awaits administrator/.test(e.message)}});assert(denied,'Pending device was allowed');
 for(const d of devices.values())d.status='approved';
 await page.evaluate(async()=>{const m=await import('/sw2/licensing.mjs');await m.requireApproval();window.privateHtml=await m.loadPrivateApp();});
 const reportId=crypto.randomUUID();await page.evaluate(async id=>{const m=await import('/sw2/licensing.mjs');await m.licenceApi('register',{report_id:id,key_b64:btoa('B'.repeat(32))});},reportId);
 const keyCheck=await page.evaluate(async u=>{const {deviceStore}=await import('/sw2/device-store.mjs'),s=deviceStore('test',u),d=await s.device();let blocked=0;for(const [format,key]of [['jwk',d.signing.privateKey],['raw',d.aes]]){try{await crypto.subtle.exportKey(format,key)}catch{blocked++}}const row=await s.get('app');return {blocked,encrypted:!!row.cipher&&!JSON.stringify(row).includes('Private inspection')};},user);assert.equal(keyCheck.blocked,2);assert(keyCheck.encrypted);
 const copied=await page.evaluate(async u=>{const {deviceStore}=await import('/sw2/device-store.mjs');const row=await deviceStore('test',u).get('app');return {iv:Array.from(row.iv),cipher:Array.from(new Uint8Array(row.cipher))};},user);
 const second=await browser.newContext(),secondPage=await second.newPage();await secondPage.goto(base);
 const copyDenied=await secondPage.evaluate(async({user,copied})=>{const {deviceStore}=await import('/sw2/device-store.mjs'),s=deviceStore('test',user);await s.put('app',{iv:new Uint8Array(copied.iv),cipher:new Uint8Array(copied.cipher).buffer});try{await s.unseal('app');return false}catch{return true}},{user,copied});assert(copyDenied,'Copied app cache decrypted on another device');await second.close();
 await context.setOffline(true);await page.waitForTimeout(30);
 const offline=await page.evaluate(async id=>{const m=await import('/sw2/licensing.mjs');const licence=await m.requireApproval();const app=await m.loadPrivateApp(),key=await m.licenceApi('open',{report_id:id});return {offline:licence.offline,app,key:key.key_b64};},reportId);assert(offline.offline);assert(offline.app.includes('Private inspection'));assert.equal(offline.key,btoa('B'.repeat(32)));
 const offlineId=crypto.randomUUID();await page.evaluate(async id=>{await(await import('/sw2/licensing.mjs')).licenceApi('register',{report_id:id,key_b64:btoa('C'.repeat(32))})},offlineId);assert(!reports.has(offlineId));
 // A copied report/app cache has no usable non-exportable key on another browser origin/store.

 const expired=await page.evaluate(async()=>{const original=Date.now;Date.now=()=>original()+25*3600000;try{await(await import('/sw2/licensing.mjs')).requireApproval();return false}catch{return true}finally{Date.now=original}});assert(expired,'Expired offline lease was allowed');
 await context.setOffline(false);await page.waitForTimeout(100);await page.evaluate(async()=>{await(await import('/sw2/licensing.mjs')).requireApproval()});assert(reports.has(offlineId),'Offline report key was not synchronised');
 active=false;await page.evaluate(async()=>{try{await(await import('/sw2/licensing.mjs')).requireApproval()}catch{}});await context.setOffline(true);await page.waitForTimeout(30);
 denied=await page.evaluate(async()=>{try{await(await import('/sw2/licensing.mjs')).requireApproval();return false}catch{return true}});assert(denied,'Revoked user reused cached licence');
 console.log('PASS: real browser device keys/IndexedDB encryption, pending approval, offline app/report opening and encrypted key queue, lease expiry, reconnect synchronisation and revoked-user cache invalidation.');
 // Confirm the complete PWA shell and dependency graph actually work offline.
 const shellContext=await browser.newContext(),shell=await shellContext.newPage();
 const shellErrors=[];shell.on('pageerror',e=>shellErrors.push(String(e)));shell.on('console',m=>console.log('SHELL',m.type(),m.text()));shell.on('requestfailed',r=>console.log('SHELL REQUEST FAILED',r.url(),r.failure()));
 await shell.goto(base+'/dist-sw2/safety-login.html');
 try{await shell.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated',null,{timeout:30000});}catch(error){console.log('SHELL DIAGNOSTICS',shellErrors,await shell.evaluate(async()=>({offlineReady:document.documentElement.dataset.sw2OfflineReady,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,installing:r.installing?.state,waiting:r.waiting?.state,active:r.active?.state})),caches:await caches.keys()})));throw error;}
 await shellContext.setOffline(true);await shell.reload();
 await shell.waitForFunction(()=>document.getElementById('loginStatus')?.textContent.includes('Login required'));
 assert.equal(shellErrors.length,0,shellErrors.join('\n'));
 console.log('PASS: installed full PWA shell and pinned dependency graph load offline; unapproved browser remains locked.');
 await shellContext.close();await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
