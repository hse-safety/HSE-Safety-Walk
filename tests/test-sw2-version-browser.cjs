const {webkit}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/')return res.end('<html><head></head><body>Login</body></html>');
  const file=path.join(root,pathname);
  res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await webkit.launch();
 try{
 for(const device of ['iPhone','Mac']){
  const context=await browser.newContext({userAgent:device==='iPhone'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'});
  const page=await context.newPage();
  await page.route('**/sw2/licensing.mjs',r=>r.fulfill({contentType:'text/javascript',body:`export async function loadPrivateApp(){return '<html><head></head><body data-sw2-app-gate>SW2ReportExport.shareSnapshot Inspection</body></html>'};export function selectModule(){};export async function rememberIdentity(){};export async function offlineIdentity(){return {userId:'test'}};export function forgetApproval(){}` }));
  await page.route('**/sw2/auth.mjs',r=>r.fulfill({contentType:'text/javascript',body:`export const sw2Client={rpc:async(name,args)=>{window.recorded=(window.recorded||[]).concat(args);return {error:null}}};`}));
  await page.route('**/sw2/client-version-telemetry.mjs',async r=>{await new Promise(done=>setTimeout(done,200));await r.continue();});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{await(await import('/sw2/launch.mjs')).openLicensedOnsite({userId:'test'},'onsite')});
  await page.waitForTimeout(700);
  const recorded=await page.evaluate(()=>window.recorded||[]);
  assert.equal(recorded.length,1,device+': module event missing after document replacement');
  assert.equal(recorded[0].p_device,device);assert.equal(recorded[0].p_module,'On-Site');assert.equal(recorded[0].p_version,'2.0');
  // Offline launch survives replacement and syncs on reconnection within the module.
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})});
  await page.evaluate(async()=>{await(await import('/sw2/launch.mjs')).openLicensedOnsite({userId:'test'},'facility')});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sw2-pending-version-events')).length),1);
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});window.dispatchEvent(new Event('online'))});
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sw2-pending-version-events')).length),0);
  assert.equal(await page.evaluate(()=>window.recorded.at(-1).p_module),'KVI Premises');
  await context.close();
 }
 console.log('PASS: iPhone/Mac module, version and device; document replacement; offline/reconnect sync');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
