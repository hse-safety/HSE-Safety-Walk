// String patches limited to security hooks/versioning; no DOM/layout reserialization.
export function prepareLicensedModule(source){
 if(typeof source!=='string'||!source.includes('data-sw2-app-gate')||!source.includes('SW2ReportExport.protectSnapshot(clearHtml)'))throw Error('Protected 2.0 module required');
 let html=source.replace(/const\s+SAFETY_WALK_VERSION\s*=\s*(['"])1\.0\1\s*;/,"const SAFETY_WALK_VERSION = '2.0';");
 html=html.replaceAll('Safety Walk 1.0','Safety Walk 2.0').replaceAll('AUDIT ID: — · V1.0','AUDIT ID: — · V2.0');
 // Exported iframe content relies on its parent licence and must not open its own session/gate.
 html=html.replaceAll("clone.querySelectorAll('script[data-sw2-secure-export]')","clone.querySelectorAll('script[data-sw2-secure-export],script[data-sw2-app-gate],style[data-sw2-app-gate]')");
 // Preserve the scoped 2.0 offline worker; legacy cleanup was for the old app only.
 html=html.replace(/<script>\s*\/\* v133 — clear legacy PWA caches\/service workers after this version loads\. \*\/[\s\S]*?<\/script>/,'');
 return html;
}
