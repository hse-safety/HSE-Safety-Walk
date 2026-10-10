import {loadPrivateApp,forgetApproval,rememberIdentity,offlineIdentity} from './licensing.mjs';
import {prepareLicensedModule} from './prepare-licensed-module.mjs';
export async function openLicensedOnsite(identity){
 if(identity)await rememberIdentity(identity);else identity=await offlineIdentity();
 let html=prepareLicensedModule(await loadPrivateApp());
 const json=JSON.stringify(identity).replace(/</g,'\\u003c');
 const script='<scr'+'ipt>window.__HSE_SW_IDENTITY='+json+';</scr'+'ipt>';
 html=html.replace('</head>',script+'</head>');
 document.documentElement.classList.remove('login-locked');document.open();document.write(html);document.close();
}
export function attachLogout(button){button?.addEventListener('click',()=>void forgetApproval(),true);}
