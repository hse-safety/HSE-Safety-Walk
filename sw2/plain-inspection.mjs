import {repairDesktopAutosave} from './desktop-autosave.mjs';
const plainShare="async function shareHtmlViaAirDrop() {\n        if (!airDropBtn) return;\n\n        // Build synchronously while the tap still counts as a user gesture in Safari.\n        // The native share sheet keeps both Mail and AirDrop available.\n        const htmlText = buildStandaloneHtmlSnapshot();\n        const fileName = buildAirDropFileName();\n        const originalText = airDropBtn.textContent || 'SEND';\n        airDropBtn.disabled = true;\n        airDropBtn.textContent = 'Preparing\u2026';\n\n        try {\n            let shareFile = new File([htmlText], fileName, { type: 'text/html' });\n            let canShareFile = isAppleMobile && typeof navigator.share === 'function';\n\n            if (canShareFile && typeof navigator.canShare === 'function') {\n                canShareFile = navigator.canShare({ files: [shareFile] });\n                if (!canShareFile) {\n                    // Some Safari versions are stricter about MIME types. Keep the\n                    // .html filename but try a generic MIME type for AirDrop.\n                    shareFile = new File([htmlText], fileName, { type: 'application/octet-stream' });\n                    canShareFile = navigator.canShare({ files: [shareFile] });\n                }\n            }\n\n            if (canShareFile) {\n                airDropBtn.textContent = 'Choose\u2026';\n                await navigator.share({\n                    title: 'HSE Safety Walk',\n                    files: [shareFile]\n                });\n                return;\n            }\n\n            fallbackDownloadHtml(fileName, htmlText);\n            alert('The completed HTML file has been created. If the iPhone share sheet did not open, open the downloaded file in Files and use Share.');\n        } catch (error) {\n            if (error?.name !== 'AbortError') {\n                console.error('Share error', error);\n                try {\n                    fallbackDownloadHtml(fileName, htmlText);\n                    alert('The share sheet could not be opened directly. The completed HTML file has been downloaded instead; share it from Files.');\n                } catch (fallbackError) {\n                    console.error('HTML fallback download error', fallbackError);\n                    alert('The HTML file could not be shared. Please try again in Safari.');\n                }\n            }\n        } finally {\n            airDropBtn.disabled = false;\n            airDropBtn.textContent = originalText;\n        }\n    }";

export function preparePlainInspection(source){
 if(typeof source!=='string'||!/<html[\s>]/i.test(source))throw Error('Inspection template unavailable');
 if(source.includes('data-facility="office"'))source=addOfficeEmergencyCommunications(source);
 let html=source.replace(/<(script|style)\b[^>]*\bdata-sw2-(?:app-gate|secure-export|draft-bridge)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 html=html.replace(/<script>\s*\/\* v133 — clear legacy PWA caches\/service workers after this version loads\. \*\/[\s\S]*?<\/script>/,'');
 html=html.replace('const airDropBtn = isAppleMobile ? outputActionBtn : null;', `const airDropBtn = isAppleMobile ? (document.getElementById('saveHtmlBtn')?.remove(), outputActionBtn) : (() => {
        let button = document.getElementById('saveHtmlBtn');
        if (!button) {
            button = document.createElement('button'); button.type = 'button'; button.id = 'saveHtmlBtn';
            button.className = outputActionBtn?.className || ''; button.textContent = 'Save HTML';
            outputActionBtn?.parentNode.insertBefore(button, outputActionBtn);
        }
        return button;
    })();`);
 html=html.replace(/async function shareHtmlViaAirDrop\(\)\s*\{[\s\S]*?\n    \}/,plainShare);
 html=html.replace(/const\s+SAFETY_WALK_VERSION\s*=\s*(['"])1\.0\1\s*;/,"const SAFETY_WALK_VERSION = '2.0';");
 html=html.replaceAll('Safety Walk 1.0','Safety Walk 2.0').replaceAll('AUDIT ID: — · V1.0','AUDIT ID: — · V2.0');
 html=html.replace(/<html\b[^>]*>/i,tag=>tag.replace(/\bclass="([^"]*)"/i,(_m,classes)=>'class="'+classes.split(/\s+/).filter(c=>!['sw2-approved','sw2-denied','login-locked'].includes(c)).join(' ')+'"').replace(/pointer-events:\s*none;?/gi,''));
 html=html.replace(/<body\b[^>]*>/i,tag=>tag.replace(/\s+inert(?:="[^"]*")?/gi,'').replace(/\s+aria-busy="[^"]*"/gi,''));
 // Exported HTML keeps its own working draft and never needs the report viewer.
 return repairDesktopAutosave(html);
}

function addOfficeEmergencyCommunications(source) {
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
