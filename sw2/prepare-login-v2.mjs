// Safety Walk 2.0 STAGING: deterministic patch for the CURRENT live login HTML.
// Does not update production by itself; writes a separate candidate file offline.
// The source MUST have the known private module loader and identity injection.
export function prepareV2LoginSource(source) {
 if(typeof source!=='string') throw Error('Login source missing');
 const before="const ONSITE_APP_FILE='onsite-v1.0.html';";
 const expected="    let html=await r.text();\n    const identity=buildIdentity();";
 if(source.split(before).length!==2||source.split(expected).length!==2
    ||!source.includes("const MODULE_BUCKET='safety-modules';"))
   throw Error('Current login version is different; manual review required');
 // Isolate the new inspection module; KVI Premises stays 1.0.
 let result=source.replace(before,"const ONSITE_APP_FILE='onsite-v2.0.html';");
 // Require a reviewed native 2.0 module before it is loaded.
 result=result.replace(expected,`    let html=await r.text();
    if (fileName === ONSITE_APP_FILE) {
      const valid = html.includes('data-safety-walk-version="2.0-staging"')
        && html.includes('data-sw2-secure-export')
        && html.includes('SW2ReportExport.protectSnapshot(clearHtml)');
      if (!valid) throw new Error('Safety Walk 2.0 security module missing; opening blocked.');
    }
    const identity=buildIdentity();`);
 return result;
}
