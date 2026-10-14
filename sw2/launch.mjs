import {loadPrivateApp,forgetApproval,rememberIdentity,offlineIdentity,selectModule} from './licensing.mjs';
import {prepareLicensedModule} from './prepare-licensed-module.mjs';
export async function openLicensedOnsite(identity,module){
 if(!module){const previous=localStorage.getItem('sw2-last-module');module=['onsite','facility'].includes(previous)?previous:'onsite';}
 selectModule(module);
 if(identity)await rememberIdentity(identity);else identity=await offlineIdentity();
 let html=prepareLicensedModule(await loadPrivateApp(module));
 // Record the module actually opened; reporting must never delay or block the inspection.
 void Promise.all([import('./auth.mjs'),import('./client-version-telemetry.mjs')]).then(([auth,telemetry])=>telemetry.logClientVersion(auth.sw2Client,'module',module==='onsite'?'On-Site':'KVI Premises')).catch(()=>{});
 const json=JSON.stringify(identity).replace(/</g,'\\u003c');
 const script='<scr'+'ipt>window.__HSE_SW_IDENTITY='+json+';</scr'+'ipt>';
 html=html.replace('</head>',script+'</head>');
 document.documentElement.classList.remove('login-locked');document.open();document.write(html);document.close();
}
export function attachLogout(button){button?.addEventListener('click',()=>void forgetApproval(),true);}
