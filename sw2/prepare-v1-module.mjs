// Keep the original inspection HTML. Change only access, export and release hooks.
const BASE='https://hse-safety.github.io/HSE-Safety-Walk/';
export function prepareV1Module(source,module='onsite') {
 if(typeof source!=='string'||!source.includes('</head>')||!source.includes('function buildStandaloneHtmlSnapshot()'))throw Error('Original inspection snapshot hook unavailable');
 let html=source.replace(/const\s+SAFETY_WALK_VERSION\s*=\s*(['"])1\.0\1\s*;/,"const SAFETY_WALK_VERSION = '2.0';");
 html=html.replaceAll('Safety Walk 1.0','Safety Walk 2.0').replaceAll('AUDIT ID: — · V1.0','AUDIT ID: — · V2.0');
 html=html.replace(/<script>\s*\/\* v133 — clear legacy PWA caches\/service workers after this version loads\. \*\/[\s\S]*?<\/script>/,'');
 const cloneHook='const clone = document.documentElement.cloneNode(true);';
 if(!html.includes(cloneHook))throw Error('Original inspection clone hook unavailable');
 html=html.replace(cloneHook,cloneHook+`
        clone.querySelectorAll('[data-sw2-app-gate],[data-sw2-secure-export]').forEach(el=>el.remove());
        clone.classList.remove('sw2-approved','sw2-denied');
        clone.style.pointerEvents='';
        delete clone.dataset.sw2Message; delete clone.dataset.sw2Approval;
        clone.querySelector('body')?.removeAttribute('inert');
        clone.querySelector('body')?.removeAttribute('aria-busy');`);
 const share=/async function shareHtmlViaAirDrop\(\)\s*\{[\s\S]*?\n    \}/;
 if(!share.test(html))throw Error('Original inspection SEND hook unavailable');
 html=html.replace(share,`async function shareHtmlViaAirDrop() {
        if(!airDropBtn) return;
        if(!window.SW2ReportExport) { alert('Report protection is starting. Please try SEND again.'); return; }
        return window.SW2ReportExport.shareSnapshot(buildStandaloneHtmlSnapshot,buildAirDropFileName,airDropBtn);
    }
    window.__SW2_SNAPSHOT=()=>buildStandaloneHtmlSnapshot();
    window.__SW2_FILENAME=()=>buildAirDropFileName();`);
 const script='<scr'+'ipt',end='</scr'+'ipt>';
 const hooks=`<style data-sw2-app-gate>html:not(.sw2-approved) body{visibility:hidden!important}</style>${script} data-sw2-app-gate>window.__SW2_MODULE=${JSON.stringify(module)};${end}${script} type="module" data-sw2-app-gate src="${BASE}sw2/app-approval-gate.mjs">${end}${script} type="module" data-sw2-secure-export src="${BASE}sw2/secure-export.mjs">${end}`;
 html=html.replace('</head>',hooks+'</head>');
 return html;
}
