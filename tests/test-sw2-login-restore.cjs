const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('safety-login.html','utf8');
const boot=html.slice(html.indexOf('async function boot(){'),html.indexOf("if('serviceWorker' in navigator)"));
async function scenario({online=true,failure=null,offlineError=null,session=true}={}){
 const calls=[];
 const ctx={navigator:{onLine:online},currentProfile:null,currentAccess:{},
 supabase:{auth:{getSession:async()=>{calls.push('session');return {data:{session:session?{}:null}}},signOut:()=>{throw Error('Must not sign out')}}},
 restoreOfflineAccess:async()=>{calls.push('offline');if(offlineError)throw offlineError},
 loadOwnProfile:async()=>{calls.push('profile');if(failure)throw failure;return {id:'user'}},loadOwnAccess:async()=>({allow_onsite:true}),
 prepareLoginOfflineAccess:async()=>calls.push('prepare'),updateSession:()=>{},show:x=>calls.push(x),status:(_,message)=>calls.push(message)};
 vm.createContext(ctx);await vm.runInContext(boot+';boot()',ctx);return calls;
}
(async()=>{
 assert.deepEqual(await scenario({online:false}),['offline']);
 assert.deepEqual(await scenario({online:true}),['offline']);
 assert.deepEqual(await scenario({offlineError:Error('Login required')}),['offline','loginCard','Login required']);
 console.log('PASS: startup restores the local session without network checks, including when the browser reports online.');
})().catch(e=>{console.error(e);process.exitCode=1});
