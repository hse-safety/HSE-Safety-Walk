// Safety Walk 2.0 STAGING: deterministic patch for the CURRENT live login HTML.
// Does not update production by itself; writes a separate candidate file offline.
// The source MUST have the known private module loader and identity injection.
export function prepareV2LoginSource(source) {
 if(typeof source!=='string') throw Error('Login source missing');
 const before="const ONSITE_APP_FILE='onsite-v1.0.html';";
 const expected="    let html=await r.text();\n    const identity=buildIdentity();";
 if(source.split(before).length!==2||source.split(expected).length!==2
    ||!source.includes("const MODULE_BUCKET='safety-modules';")
    ||!source.includes("const KVI_APP_FILE='kvi-premises-v1.0.html';"))
   throw Error('Current login version is different; manual review required');
 // Isolate the new inspection module; KVI Premises stays 1.0.
 let result=source.replace(before,"const ONSITE_APP_FILE='onsite-v2.0.html';");
 // Require a reviewed native 2.0 module before it is loaded.
 result=result.replace(expected,`    let html=await r.text();
    if (fileName === ONSITE_APP_FILE) {
      const valid = html.includes('data-safety-walk-version="2.0-staging"')
        && html.includes('data-sw2-app-gate')
        && html.includes('data-sw2-secure-export')
        && html.includes('SW2ReportExport.protectSnapshot(clearHtml)');
      if (!valid) throw new Error('Safety Walk 2.0 security module missing; opening blocked.');
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Login required');
      const check=await fetch(SUPABASE_URL+'/functions/v1/sw2-report-key', {
        method:'POST', cache:'no-store',
        headers:{'Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({action:'status'})
      });
      const approval=await check.json().catch(()=>({}));
      if (!check.ok || approval.approved !== true) throw new Error('On-Site 2.0 approval denied.');
      // Mirror the already-proven iPhone preview's On-Site display version fix.
      // No inspection content, SEND workflow or KVI functionality is changed.
      html=html.replace("const SAFETY_WALK_VERSION = '1.0';", "const SAFETY_WALK_VERSION = '2.0';");
    }
    const identity=buildIdentity();`);
 return result.replaceAll('SAFETY WALK 1.0','SAFETY WALK 2.0').replaceAll('Safety Walk 1.0','Safety Walk 2.0');
}
