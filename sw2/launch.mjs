import {loadPrivateApp,forgetApproval,offlineIdentity,selectModule} from './licensing.mjs';
import {prepareLicensedModule} from './prepare-licensed-module.mjs';
import {sw2Client} from './auth.mjs';
import {logClientVersion,flushClientVersions} from './client-version-telemetry.mjs';
export async function openLicensedOnsite(identity,module){
 if(!module){const previous=localStorage.getItem('sw2-last-module');module=['onsite','facility'].includes(previous)?previous:'onsite';}
 selectModule(module);
 if(!identity)identity=await offlineIdentity();
 let html=prepareLicensedModule(await loadPrivateApp(module,identity));
 const json=JSON.stringify(identity).replace(/</g,'\\u003c');
 const script='<scr'+'ipt>window.__HSE_SW_IDENTITY='+json+';</scr'+'ipt>';
 html=html.replace('</head>',script+'</head>');
 document.documentElement.classList.remove('login-locked');document.open();document.write(html);document.close();
 // document.open cancels pending imports/requests and removes window listeners.
 // Load telemetry with the launcher and record only after the document is replaced.
 try{
  logClientVersion(sw2Client,'module',module==='onsite'?'On-Site':'KVI Premises',identity?.userId);
  window.addEventListener('online',()=>void flushClientVersions(sw2Client,identity?.userId));
 }catch{/* Reporting must never prevent inspection use. */}
}
export function attachLogout(button){button?.addEventListener('click',()=>void forgetApproval(),true);}
