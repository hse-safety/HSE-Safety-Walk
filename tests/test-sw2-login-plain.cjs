const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),original=fs.readFileSync(path.join(root,'app-v137.html'),'utf8');
 const browser=await chromium.launch({headless:true,...(process.env.SW2_CHROME?{executablePath:process.env.SW2_CHROME}:{})});
 const context=await browser.newContext({acceptDownloads:true});let requests=[],errors=[];
 const user='11111111-1111-4111-8111-111111111111';
 await context.route('https://safetywalk.example/**',route=>{
  const part=new URL(route.request().url()).pathname.slice(1);requests.push(part);
  if(part==='sw2/client.mjs')return route.fulfill({contentType:'text/javascript',body:`
   const user={id:'${user}',email:'test@example.invalid'};
   const session=()=>JSON.parse(localStorage.getItem('sb-hvgljbyethfwxajnrvvi-auth-token')||'null');
   export const sw2Client={auth:{getSession:async()=>({data:{session:session()}}),getUser:async()=>({data:{user:session()?.user||null}}),signInWithPassword:async()=>{localStorage.setItem('sb-hvgljbyethfwxajnrvvi-auth-token',JSON.stringify({user,access_token:'test'}));return {}},signOut:async()=>{localStorage.removeItem('sb-hvgljbyethfwxajnrvvi-auth-token');return {}}},
    from:table=>({select:()=>({eq:()=>({single:async()=>({data:{...user,display_name:'Desktop Test',role:'user',active:true}}),maybeSingle:async()=>({data:{allow_onsite:true}})})})}),rpc:async()=>({}),
    storage:{from:()=>({download:async()=>{if(!session())return {error:{status:401}};const r=await fetch('/original.html');return {data:await r.blob()}}})}
   };`});
  if(part==='original.html')return route.fulfill({contentType:'text/html',body:original});
  const file=path.resolve(root,part||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:/\.m?js$/.test(file)?'text/javascript':'text/html',body:fs.readFileSync(file)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('https://safetywalk.example/safety-login.html');
 assert(await page.locator('#loginCard').isVisible(),'App did not require login');
 await page.locator('#email').fill('test@example.invalid');await page.locator('#password').fill('test');await page.locator('#login').click();
 await page.locator('#onsiteAppBtn').waitFor({state:'visible'});await page.locator('#onsiteAppBtn').click();
 await page.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 assert.equal(await page.locator('[data-sw2-app-gate], [data-sw2-secure-export]').count(),0);
 await page.locator('#itemsContainer textarea').first().fill('Plain report text');
 const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6L5sAAAAASUVORK5CYII=';
 await page.locator('#itemsContainer .photo-slot').first().evaluate((slot,src)=>{const img=document.createElement('img');img.src=src;slot.append(img)},photo);
 await page.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 page.on('dialog',dialog=>dialog.accept());
 const downloaded=page.waitForEvent('download');await page.locator('#saveHtmlBtn').click();
 const download=await downloaded.catch(async e=>{console.log('DIAGNOSTICS',errors,await page.locator('#saveHtmlBtn').evaluate(el=>el.outerHTML));throw e;}),html=fs.readFileSync(await download.path(),'utf8');
 assert(html.includes('Plain report text'));assert(html.includes(photo));assert(!html.includes('id="sw2-payload"'));assert(!/src=["'][^"']*sw2\/(?:app-approval|secure-export)/.test(html));
 const file=path.join(root,'work','plain-login-report.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);
 // A separate browser context has no app login and no prior report storage.
 const standalone=await browser.newContext(),plain=await standalone.newPage();plain.on('pageerror',e=>errors.push(String(e)));
 await plain.goto(require('node:url').pathToFileURL(file).href);await plain.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 assert.equal(await plain.locator('#itemsContainer textarea').first().inputValue(),'Plain report text');assert.equal(await plain.locator('#itemsContainer .photo-slot img').first().getAttribute('src'),photo);
 await plain.locator('#itemsContainer textarea').first().fill('Edited without login or decryption');await plain.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});await plain.reload();await plain.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 assert.equal(await plain.locator('#itemsContainer textarea').first().inputValue(),'Edited without login or decryption');
 // iPhone SEND keeps its native share call inside the original user gesture.
 const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(String(e)));
 await mobile.addInitScript(()=>{
  Object.defineProperty(navigator,'userAgent',{get:()=> 'iPhone'});
  Object.defineProperty(navigator,'canShare',{value:()=>true});
  Object.defineProperty(navigator,'share',{value:async({files})=>{window.shareWasActive=navigator.userActivation.isActive;window.sharedHtml=await files[0].text();}});
 });
 await mobile.goto('https://safetywalk.example/safety-login.html');await mobile.locator('#onsiteAppBtn').click();await mobile.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 assert.equal(await mobile.locator('#sw2AutosaveStatus').isVisible(),false);
 await mobile.locator('#outputActionBtn').click();await mobile.waitForFunction(()=>window.sharedHtml);
 const sent=await mobile.evaluate(()=>({html:window.sharedHtml,active:window.shareWasActive}));
 assert(sent.active,'iPhone share lost the user gesture');assert(sent.html.includes('Plain report text'));assert(sent.html.includes(photo));assert(!sent.html.includes('id="sw2-payload"'));
 await mobile.close();
 // Previously logged-in app works offline without a timed licence.
 await context.setOffline(true);await page.goto('https://safetywalk.example/safety-login.html');await page.locator('#onsiteAppBtn').waitFor({state:'visible'});await page.locator('#onsiteAppBtn').click();await page.locator('#sw2AutosaveStatus').filter({hasText:'saved locally'}).waitFor({state:'attached'});
 assert.equal(await page.locator('#itemsContainer textarea').first().inputValue(),'Plain report text');
 assert(!requests.some(p=>p==='sw2/licensing.mjs'||p==='sw2/app-approval-gate.mjs'||p==='sw2/secure-export-2.0.1.mjs'),'New workflow still loads report protection');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: app login required; plain HTML sharing preserves text/photos; standalone file edits and autosaves without login; offline app restores inspection without a licence.');
})().catch(e=>{console.error(e);process.exit(1)});
