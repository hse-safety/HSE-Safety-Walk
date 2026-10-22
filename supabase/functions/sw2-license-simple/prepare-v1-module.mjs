// Keep the original inspection HTML. Change only access, export and release hooks.
const BASE='https://hse-safety.github.io/HSE-Safety-Walk/';
export function prepareV1Module(source,module='onsite') {
 if(typeof source!=='string'||!source.includes('</head>')||!source.includes('function buildStandaloneHtmlSnapshot()'))throw Error('Original inspection snapshot hook unavailable');
 let html=source.replace(/const\s+SAFETY_WALK_VERSION\s*=\s*(['"])1\.0\1\s*;/,"const SAFETY_WALK_VERSION = '2.0';");
 if(module==='facility')html=addOfficeEmergencyCommunications(html);
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
    window.__SW2_FILENAME=()=>buildAirDropFileName();
    window.__SW2_SEND_BUTTON=airDropBtn;`);
 const script='<scr'+'ipt',end='</scr'+'ipt>';
 const hooks=`<style data-sw2-app-gate>html:not(.sw2-approved) body{visibility:hidden!important}</style>${script} data-sw2-app-gate>window.__SW2_MODULE=${JSON.stringify(module)};${end}${script} type="module" data-sw2-app-gate src="${BASE}sw2/app-approval-gate.mjs">${end}${script} type="module" data-sw2-secure-export src="${BASE}sw2/secure-export-2.0.1.mjs">${end}`;
 html=html.replace('</head>',hooks+'</head>');
 return html;
}

// Safety Walk 2.0: add the Office-only communication-equipment question.
// Append it physically to preserve all existing question/input/photo positions
// in saved drafts; the original Premises sorter displays it after Office Q9.
export function addOfficeEmergencyCommunications(source) {
 const title='Emergency Communication Equipment – Megaphones and Handheld Radios';
 if(source.includes('<span class="question-title">'+title+'</span>'))return source;
 const sample=/<!-- Item 9 -->\s*(<div class="inspection-item"[\s\S]*?)(?=<!-- Item 10 -->)/.exec(source)?.[1];
 const items=[...source.matchAll(/<div class="inspection-item"[^>]*data-index="(\d+)"/g)];
 const boundary=/(<\/div>)(\s*<div class="observations-section")/g;
 if(!sample||!sample.includes('data-facility="office"')||!sample.includes('Emergency Response Arrangements and Equipment')||items.length<20||[...source.matchAll(boundary)].length!==1) {
   throw Error('Office communications question cannot be safely inserted into the original Premises template');
 }
 const nextIndex=Math.max(...items.map(item=>Number(item[1])))+1;
 const question='Have megaphones been function-tested to confirm clear and audible sound output, with battery condition checked and batteries replaced where necessary? Where handheld radios are provided for internal emergency communication, has a radio communication check been completed with all units, confirming satisfactory operation and that all batteries are fully charged?';
 const added=sample
  .replace(/data-index="\d+"/,'data-index="'+nextIndex+'"')
  .replace(/data-original-number="\d+(?:\.\d+)?"/,'data-original-number="9.5"')
  .replace(/<span class="num">\d+<\/span>/,'<span class="num">10</span>')
  .replace('Emergency Response Arrangements and Equipment',title)
  .replace(/(<span class="question-description">)[\s\S]*?(<\/span>)/,(_m,a,b)=>a+question+b);
 if(!added.includes('data-original-number="9.5"')||!added.includes('data-index="'+nextIndex+'"')||!added.includes(question))throw Error('Office question transformation failed');
 return source.replace(boundary,(_m,close,next)=>'\n<!-- Safety Walk 2.0: Office emergency communications -->\n'+added+'\n'+close+next);
}
