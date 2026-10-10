import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const viewer=readFileSync(new URL('../sw2/report-viewer-v2.html',import.meta.url),'utf8');
// Actual inspection is private Supabase Storage, never available to public CI.
assert.match(viewer,/window\.__SW2_VIEWER_FRAME=true/);
assert.match(viewer,/postMessage|addEventListener\('message'/);
assert(!viewer.includes('window.__SW2_VIEWER_FRAME=true;<\\\\/script>'),'iframe bootstrap must use a real closing script tag');
assert.match(viewer,/requestEpoch!==accessEpoch/,'Pending report opening must be cancelled on lock');
assert.match(viewer,/await verify\(\);\s*if\(requestEpoch!==accessEpoch\)/,'Revalidate approval immediately before showing the report');
assert.match(viewer,/saveEpoch!==accessEpoch/,'Pending report save must be cancelled on lock');
assert.match(viewer,/if\(epoch===accessEpoch\)revoke\(\)/,'Delayed polling responses must not lock new sessions');
console.log('SW2 viewer integration checks passed');
