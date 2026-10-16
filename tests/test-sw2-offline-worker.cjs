const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('offline-sw.js','utf8');
async function scenario({online,method='GET',url='https://example.test/app/safety-login.html',mode='navigate'}){
 const handlers={},cached={cached:true};let fetches=0,response;
 const context={URL,AbortController,setTimeout,clearTimeout,self:{location:{href:'https://example.test/app/offline-sw.js'},navigator:{onLine:online},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({match:async()=>cached,put:async()=>{}})},fetch:async()=>{fetches++;return {ok:true,clone:()=>({})}}};
 vm.runInNewContext(source,context);
 handlers.fetch({request:{url,method,mode},respondWith:p=>response=p});
 return {response:await response,fetches,cached};
}
(async()=>{
 let r=await scenario({online:false});assert.equal(r.response,r.cached);assert.equal(r.fetches,0,'Offline startup attempted a network request');
 r=await scenario({online:true});assert.equal(r.fetches,1,'Online navigation did not check the network');
 r=await scenario({online:false,url:'https://project.supabase.co/auth/v1/user'});assert.equal(r.response,undefined,'Worker intercepted private auth');
 r=await scenario({online:false,method:'POST'});assert.equal(r.response,undefined);
 console.log('PASS: offline navigation uses cache immediately; online navigation stays fresh; auth and POST requests are never intercepted.');
})().catch(e=>{console.error(e);process.exitCode=1});
