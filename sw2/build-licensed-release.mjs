import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const source=resolve(args.source||'safety-login.html'),out=resolve(args.out||'dist-sw2');
let html=await readFile(source,'utf8');
const start=html.indexOf('async function openPrivateModule('),end=html.indexOf("$('login').onclick",start);
if(start<0||end<start||!html.includes('https://hvgljbyethfwxajnrvvi.supabase.co'))throw Error('Verified live Safety Walk login source required');
const original=html.slice(start,end).replace('async function openPrivateModule(', 'async function openLegacyPrivateModule(');
const loader=`async function openPrivateModule(file,label,allowed){
 if(file!==ONSITE_APP_FILE)return openLegacyPrivateModule(file,label,allowed);
 if(!allowed()){status('readyStatus','On-Site approval required.');return;}
 status('readyStatus','Opening On-Site…',true);
 try{const {openLicensedOnsite}=await import('./sw2/launch.mjs');await openLicensedOnsite(buildIdentity());}catch(error){status('readyStatus',error.message);}
}\n`;
html=html.slice(0,start)+original+loader+html.slice(end);
html=html.replace(/const ONSITE_APP_FILE='[^']+';/,"const ONSITE_APP_FILE='onsite-v2.0.html';");
html=html.replace(/\bboot\(\);\s*<\/script>/,`if('serviceWorker' in navigator)void navigator.serviceWorker.register('./offline-sw.js',{scope:'./'});
if(navigator.onLine!==false)boot();else{try{const {openLicensedOnsite}=await import('./sw2/launch.mjs');await openLicensedOnsite();}catch(error){status('loginStatus',error.message);}}
</script>`);
const management='<script type="module">import {attachDeviceManagement} from "./sw2/device-management.mjs";import {attachLogout} from "./sw2/launch.mjs";attachDeviceManagement(document.getElementById("adminCard"));attachLogout(document.getElementById("logout"));</scr'+'ipt>';
html=html.replace('</body>',management+'</body>');
const sourceBody=(await readFile(source,'utf8')).split('<script type="module">')[0].split('<body')[1];
const resultBody=html.split('<script type="module">')[0].split('<body')[1];
if(sourceBody!==resultBody)throw Error('Login layout was modified');
await mkdir(out,{recursive:true});await writeFile(resolve(out,'safety-login.html'),html);
await cp('sw2',resolve(out,'sw2'),{recursive:true});await cp('sw2/sw2-offline-sw.js',resolve(out,'offline-sw.js'));
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));manifest.name='Safety Walk 2.0';manifest.short_name='Safety Walk 2.0';
// Existing installation identity and start URL retained so restarting updates the same app.
await writeFile(resolve(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2));
await cp('index.html',resolve(out,'index.html'));
for(const p of ['apple-touch-icon.png','icon-192.png','icon-512.png','safety-walk-cover.png'])await cp(p,resolve(out,p));
console.log('Built complete 2.0 release; login body/layout and KVI route retained.');
