const webkit=require('playwright')[process.env.SW2_TEST_BROWSER||'webkit'];
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const user='11111111-1111-4111-8111-111111111111';
 const root=path.resolve(__dirname,'..');
 const original=fs.readFileSync(path.join(root,'safety-login.html'),'utf8');
 const marker="void boot();";
 const start=original.indexOf(marker),end=original.indexOf('</script>',start);
 assert(start>0&&end>start);
 const html=original.slice(0,start)+`window.renderManagementTest=()=>{currentProfile={id:'admin',role:'admin'};show('adminCard');renderUsers([{id:'${user}',email:'test@example.invalid',display_name:'Offline test',role:'user',active:true,offlineAvailable:true,allowOffline:true,access:{allow_onsite:true}}]);};`+original.slice(end);
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',/\.m?js$/.test(pathname)?'text/javascript':'text/html');
  if(pathname==='/safety-login.html')return res.end(html);
  if(pathname==='/sw2/licensing.mjs')return res.end(`export async function adminDevices(action,fields){window.managementCalls??=[];window.managementCalls.push({action,fields});if(window.rejectManagementSave)throw Error('Save failed');return {saved:true};}`);
  if(pathname==='/sw2/launch.mjs')return res.end('export function attachLogout(){}');
  if(pathname==='/offline-sw.js'){res.writeHead(404);return res.end();}
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await webkit.launch({headless:true}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/safety-login.html');
  await page.waitForFunction(()=>window.renderManagementTest);
  await page.evaluate(()=>window.renderManagementTest());
  const checkbox=page.locator('[data-offline-user]');assert(await checkbox.isChecked());
  await checkbox.uncheck();await page.waitForFunction(()=>window.managementCalls?.length===1);
  assert.deepEqual(await page.evaluate(()=>window.managementCalls[0]),{action:'set-offline',fields:{user_id:user,allow_offline:false}});
  await page.waitForFunction(()=>!document.querySelector('[data-offline-user]').disabled);
  await page.evaluate(()=>window.rejectManagementSave=true);await checkbox.click();
  await page.waitForFunction(()=>document.getElementById('adminStatus').textContent==='Save failed');assert(!(await checkbox.isChecked()),'Failed save did not restore confirmed setting');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: User Management displays 48-hour offline approval, saves per-user changes, and restores the confirmed value after a failed save.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
