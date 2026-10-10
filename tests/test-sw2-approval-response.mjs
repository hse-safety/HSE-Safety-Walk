import assert from 'node:assert/strict';
import { validateApprovalResponse } from '../sw2/approval-response.mjs';
assert.deepEqual(validateApprovalResponse('status',{approved:true}),{approved:true});
for(const value of [false,null,undefined,0,'true']) {
  assert.throws(()=>validateApprovalResponse('status',{approved:value}));
}
assert.throws(()=>validateApprovalResponse('status',null));
assert.throws(()=>validateApprovalResponse('status',[]));
const key=Buffer.alloc(32,42).toString('base64');
assert.equal(validateApprovalResponse('open',{key_b64:key}).key_b64,key);
for(const bad of ['', 'invalid', Buffer.alloc(31).toString('base64')]) {
  assert.throws(()=>validateApprovalResponse('open',{key_b64:bad}));
}
assert.equal(validateApprovalResponse('register',{registered:true}).registered,true);
assert.throws(()=>validateApprovalResponse('register',{registered:false}));
assert.throws(()=>validateApprovalResponse('register',{}));
assert.throws(()=>validateApprovalResponse('unknown',{}));
console.log('PASS: SW2 approval status, key and registration response verification');
