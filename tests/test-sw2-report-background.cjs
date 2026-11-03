const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  window.reportIntervals=[];window.reportTimeouts=[];
  const interval=window.setInterval,timeout=window.setTimeout;
  window.setInterval=(fn,ms,...args)=>{if(ms===15000)window.reportIntervals.push(fn);return interval(fn,ms,...args)};
  window.setTimeout=(fn,ms,...args)=>{if(ms>100000)window.reportTimeouts.push(fn);return timeout(fn,ms,...args)};
 });
 await page.route('https://safetywalk.example/**',route=>{
  const part=new URL(route.request().url()).pathname.slice(1);
  if(part==='sw2/licensing.mjs')return route.fulfill({contentType:'text/javascript',body:'export async function reportDraftStore(){return {read:async()=>null,write:async()=>{},clear:async()=>{}}};export async function forgetApproval(){};export function onApprovalChange(fn){window.approvalListener=fn;};export function invalidateApproval(){};'});
  if(part==='sw2/auth.mjs')return route.fulfill({contentType:'text/javascript',body:`
   window.fake={approved:true,signedIn:false,keys:{},pending:null,hold:false};
   export const sw2Client={auth:{signInWithPassword:async()=>{fake.signedIn=true;return {}},signOut:async()=>{fake.signedIn=false}}};
   export async function approvalApi(action,fields={}){
    if(action==='status'&&fake.hold)await new Promise(r=>fake.pending=r);
    if(!fake.signedIn||!fake.approved){window.approvalListener?.({approved:false});throw Error('Access denied');}
    if(action==='status'){window.approvalListener?.({approved:true});return {server_time:Date.now(),expires_at:Date.now()+172800000};}
    if(action==='open')return {key_b64:fake.keys[fields.report_id]};
    if(action==='register'){fake.keys[fields.report_id]=fields.key_b64;return {registered:true}};
   }`});
  const file=path.resolve(root,part);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:part.endsWith('.mjs')?'text/javascript':'text/html',body:fs.readFileSync(file)});
 });
 await page.goto('https://safetywalk.example/sw2/report-viewer-v2.html');
 await page.locator('#email').fill('test@example.invalid');await page.locator('#password').fill('test');await page.locator('#loginForm button').click();await page.locator('#pickScreen').waitFor({state:'visible'});
 const carrier=await page.evaluate(async()=>{const m=await import('./report-core.mjs'),r=await m.encryptHtml('<!doctype html><html><body style="height:2500px"><textarea id="notes">Original</textarea><script>window.loads=1</script></body></html>');fake.keys[r.package.id]=r.key;return m.buildCarrierHtml(r.package,location.href)});
 await page.locator('#reportFile').setInputFiles({name:'report.html',mimeType:'text/html',buffer:Buffer.from(carrier)});await page.locator('#openReport').click();
 const frame=page.frameLocator('#inspectionFrame'),notes=frame.locator('#notes');await notes.fill('Work in progress');await notes.evaluate(el=>{el.focus();el.setSelectionRange(3,8);window.scrollTo(0,200);window.sentinel={};});
 await page.evaluate(()=>{window.mutations=[];new MutationObserver(ms=>mutations.push(...ms.map(m=>m.attributeName))).observe(document.querySelector('#inspectionFrame'),{attributes:true});});
 assert.equal(await page.evaluate(()=>reportIntervals.length),0,'Report still renews a timed licence while editing');
 await page.evaluate(()=>{fake.approved=false;window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('offline'));document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('#inspectionFrame').evaluate(el=>el.inert||getComputedStyle(el).visibility==='hidden'),false,'Connection change interrupted report');
 assert.deepEqual(await notes.evaluate(el=>[el===document.activeElement,el.value,el.selectionStart,el.selectionEnd,window.scrollY,!!window.sentinel]),[true,'Work in progress',3,8,200,true]);
 assert.deepEqual(await page.evaluate(()=>mutations),[],'Connection changes mutated the report frame');
 await page.locator('#closeReport').click();await page.locator('#viewerScreen').waitFor({state:'hidden'});
 assert.equal(await page.locator('#inspectionFrame').getAttribute('srcdoc'),null);assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: report editing preserves focus, text, selection and photos without recurring licence checks; Close Report still works.');
})().catch(e=>{console.error(e);process.exit(1)});
