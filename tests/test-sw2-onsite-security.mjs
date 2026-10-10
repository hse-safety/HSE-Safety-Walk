import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Private On-Site source is intentionally not checked into public GitHub.

const gate=readFileSync(new URL('../sw2/app-approval-gate.mjs',import.meta.url),'utf8');
assert.match(gate,/requireApproval\(\)/);
const licensing=readFileSync(new URL('../sw2/licensing.mjs',import.meta.url),'utf8');
assert.match(licensing,/window\.addEventListener\('offline'/);
assert.match(gate,/onApprovalChange/);
assert.equal(gate.includes('filter: blur'),false);
assert(gate.includes('html:not(.sw2-approved) body{visibility:hidden'));
assert.match(gate,/document\.body\.inert=!approved/);
console.log('PASS: public approval gate is fail-closed; private On-Site source is checked in Supabase only');
