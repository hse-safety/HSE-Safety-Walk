import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Private On-Site source is intentionally not checked into public GitHub.

const gate=readFileSync(new URL('../sw2/app-approval-gate.mjs',import.meta.url),'utf8');
assert.match(gate,/approvalApi\('status'\)/);
assert.match(gate,/window\.addEventListener\('offline'/);
assert.match(gate,/createApprovalController/);
assert.equal(gate.includes('filter: blur'),false);
assert(gate.includes('html:not(.sw2-approved) body { visibility: hidden'));
console.log('PASS: public approval gate is fail-closed; private On-Site source is checked in Supabase only');
