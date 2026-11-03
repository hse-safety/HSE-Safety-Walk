const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({headless:true,...(process.env.SW2_CHROME?{executablePath:process.env.SW2_CHROME}:{})});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://safetywalk.example/**',route=>{
  const part=new URL(route.request().url()).pathname.slice(1);
  if(part==='sw2/licensing.mjs')return route.fulfill({contentType:'text/javascript',body:`
   import {deviceStore} from './device-store.mjs';
   const store=deviceStore('desktop-test','user');
   export async function reportDraftStore(id){return {read:()=>store.unseal('draft:'+id),write:v=>{if(window.failDraftWrites)throw Error('Storage full');return store.seal('draft:'+id,v)},clear:()=>store.remove('draft:'+id)}};
   export async function forgetApproval(){};export function onApprovalChange(){};export function invalidateApproval(){};`});
  if(part==='sw2/auth.mjs')return route.fulfill({contentType:'text/javascript',body:`
   window.keys={};export const sw2Client={auth:{signInWithPassword:async()=>({}),signOut:async()=>({})}};
   export async function approvalApi(action,fields={}){
    if(action==='status')return {approved:true,server_time:Date.now(),expires_at:Date.now()+172800000};
    if(action==='open')return {key_b64:keys[fields.report_id]};
    if(action==='register'){keys[fields.report_id]=fields.key_b64;return {registered:true}};
   }`});
  const file=path.resolve(root,part);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:part.endsWith('.mjs')?'text/javascript':'text/html',body:fs.readFileSync(file)});
 });
 await page.goto('https://safetywalk.example/sw2/report-viewer-v2.html');
 await page.locator('#pickScreen').waitFor({state:'visible'});
 const original=fs.readFileSync(path.join(root,'app-v137.html'),'utf8');
 const report=await page.evaluate(async html=>{const m=await import('./report-core.mjs'),r=await m.encryptHtml(html);keys[r.package.id]=r.key;return {carrier:m.buildCarrierHtml(r.package,location.href),id:r.package.id,key:r.key}},original);
 const open=async()=>{await page.locator('#reportFile').setInputFiles({name:'inspection.html',mimeType:'text/html',buffer:Buffer.from(report.carrier)});await page.locator('#openReport').click();await page.frameLocator('#inspectionFrame').locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});};
 await open();
 const frame=page.frameLocator('#inspectionFrame');
 const note=frame.locator('#itemsContainer textarea').first();
 await note.fill('Desktop text survives decryption and reopening');
 await frame.locator('#manualObsBtn').click();
 await frame.locator('#manualObservationsList textarea').first().fill('Dynamic observation survives too');
 // Use the real photo setter, including a replacement and a removal.
 const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6L5sAAAAASUVORK5CYII=';
 await frame.locator('#itemsContainer .photo-slot').first().evaluate((slot,photo)=>{const img=slot.querySelector('img')||document.createElement('img');img.src=photo;if(!img.parentNode)slot.append(img);},photo);
 await frame.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 await page.waitForTimeout(350);
 const stored=await page.evaluate(async id=>{const {reportDraftStore}=await import('./licensing.mjs');return (await reportDraftStore(id)).read()},report.id);
 assert(stored.staticFields.some(f=>f.value==='Desktop text survives decryption and reopening'));
 assert.equal(stored.questionPhotos[0],photo);
 await page.evaluate(()=>window.failDraftWrites=true);
 await note.fill('Unsaved during full storage');
 await frame.locator('#sw2AutosaveStatus').filter({hasText:'NOT SAVED'}).waitFor({state:'attached'});
 const previous=await page.evaluate(async id=>(await(await import('./licensing.mjs')).reportDraftStore(id)).read(),report.id);
 assert(previous.staticFields.some(f=>f.value==='Desktop text survives decryption and reopening'),'Failed save overwrote the previous draft');
 await page.evaluate(()=>window.failDraftWrites=false);await note.fill('Desktop text survives decryption and reopening');
 await frame.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 const retained=await page.evaluate(async id=>{const {deviceStore}=await import('./device-store.mjs'),store=deviceStore('desktop-test','user');await store.seal('app:onsite','cache');await store.purge();return {draft:await store.unseal('draft:'+id),app:await store.unseal('app:onsite')}},report.id);
 assert(retained.draft,'Session cleanup deleted the working draft');assert.equal(retained.app,null);
 // A completely new viewer document must restore the same report's draft.
 await page.reload();await page.evaluate(({id,key})=>keys[id]=key,report);await open();
 assert.equal(await frame.locator('#itemsContainer textarea').first().inputValue(),'Desktop text survives decryption and reopening');
 assert.equal(await frame.locator('#manualObservationsList textarea').first().inputValue(),'Dynamic observation survives too');
 assert.equal(await frame.locator('#itemsContainer .photo-slot').first().locator('img').getAttribute('src'),photo);
 await frame.locator('#itemsContainer .photo-slot').first().evaluate(slot=>{slot.querySelector('img').remove();});
 await frame.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});await page.waitForTimeout(350);
 await page.reload();await page.evaluate(({id,key})=>keys[id]=key,report);await open();
 assert.equal(await frame.locator('#itemsContainer .photo-slot').first().locator('img').count(),0,'Deleted photo returned');
 assert.equal(await frame.locator('#itemsContainer textarea').first().inputValue(),'Desktop text survives decryption and reopening');
 assert.equal(await frame.locator('#manualObservationsList textarea').first().inputValue(),'Dynamic observation survives too');
 await frame.locator('#itemsContainer textarea').first().fill('Last edit immediately before Close Report');
 await page.locator('#closeReport').click();await page.locator('#viewerScreen').waitFor({state:'hidden'});
 await open();
 assert.equal(await frame.locator('#itemsContainer textarea').first().inputValue(),'Last edit immediately before Close Report');
 // The same repair also works when a decrypted HTML file opens directly on desktop.
 const {repairDesktopAutosave}=await import('../sw2/desktop-autosave.mjs');
 const file=path.join(root,'work','desktop-autosave-test.html');fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,process.env.SW2_PLAIN_REPORT?fs.readFileSync(process.env.SW2_PLAIN_REPORT,'utf8'):repairDesktopAutosave(original));
 const plain=await browser.newPage();plain.on('pageerror',e=>errors.push(String(e)));
 await plain.goto(require('node:url').pathToFileURL(file).href);
 await plain.locator('#sw2AutosaveStatus, #plainSaveStatus').filter({hasText:/saved locally|gemt lokalt/i}).waitFor({state:'attached'});
 await plain.locator('#itemsContainer textarea').first().fill('Standalone decrypted desktop draft');
 await plain.locator('#itemsContainer .photo-slot').first().evaluate((slot,photo)=>{const img=slot.querySelector('img')||document.createElement('img');img.src=photo;if(!img.parentNode)slot.append(img);},photo);
 await plain.waitForTimeout(500);await plain.locator('#sw2AutosaveStatus, #plainSaveStatus').filter({hasText:/saved locally|gemt lokalt/i}).waitFor({state:'attached'});
 await plain.reload();await plain.locator('#sw2AutosaveStatus, #plainSaveStatus').filter({hasText:/saved locally|gemt lokalt/i}).waitFor({state:'attached'});
 assert.equal(await plain.locator('#itemsContainer textarea').first().inputValue(),'Standalone decrypted desktop draft');
 assert.equal(await plain.locator('#itemsContainer .photo-slot').first().locator('img').getAttribute('src'),photo);
 assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: real opaque-origin decrypted inspection restores desktop text and photos after viewer reload; deleted photos stay deleted.');
})().catch(e=>{console.error(e);process.exit(1)});
