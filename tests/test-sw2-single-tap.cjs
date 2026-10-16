const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('safety-login.html','utf8');
const source=html.slice(html.indexOf('let offlinePreparation='),html.indexOf('async function restoreOfflineAccess()'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
async function scenario(module,preparing){
 const prep=deferred(),launch=deferred(),calls=[],buttons={onsiteAppBtn:{disabled:false},kviPremisesBtn:{disabled:false}};
 let message='';
 const context=vm.createContext({$:id=>buttons[id],status:(_,m)=>message=m,buildIdentity:()=>({userId:'test'}),ONSITE_APP_FILE:'onsite.html'});
 const licensing=new vm.SyntheticModule(['prepareOfflineAccess'],function(){this.setExport('prepareOfflineAccess',()=>prep.promise)},{context});
 const launcher=new vm.SyntheticModule(['openLicensedOnsite'],function(){this.setExport('openLicensedOnsite',async(identity,selected)=>{calls.push(selected);await launch.promise})},{context});
 for(const m of [licensing,launcher]){await m.link(()=>{});await m.evaluate()}
 await new vm.Script(source,{importModuleDynamically:specifier=>specifier.includes('licensing')?licensing:launcher}).runInContext(context);
 if(preparing){vm.runInContext('prepareLoginOfflineAccess()',context);assert.equal(buttons.onsiteAppBtn.disabled,false)}
 const invoke=()=>vm.runInContext(`openPrivateModule('${module==='onsite'?'onsite.html':'facility.html'}','Test',()=>true)`,context);
 const first=invoke();await invoke();assert.equal(buttons.onsiteAppBtn.disabled,true);
 prep.resolve({ready:true});await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls,[module]);assert.equal(message,'Opening Test…');
 launch.resolve();await first;assert.equal(buttons.onsiteAppBtn.disabled,false);
}
(async()=>{for(const module of ['onsite','facility'])for(const preparing of [true,false])await scenario(module,preparing);console.log('PASS: one tap launches either module during preparation and after Ready; repeated taps cannot start competing launches.');})().catch(e=>{console.error(e);process.exitCode=1});
