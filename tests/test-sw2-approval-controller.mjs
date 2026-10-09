import assert from 'node:assert/strict';
import { createApprovalController } from '../sw2/approval-controller.mjs';
const states = [];
let allowed = true;
const controller = createApprovalController({
  check: async () => allowed,
  onState: state => states.push(state)
});
assert.equal(await controller.verify(), true);
assert.equal(controller.getState(), 'approved');
allowed = false;
assert.equal(await controller.verify(), false);
assert.equal(controller.getState(), 'denied');
controller.lock();
assert.notEqual(controller.getState(), 'approved');
controller.stop();
assert.equal(controller.getState(), 'denied');
console.log('SW2 approval-controller test passed');

let release;
const pending = new Promise(resolve=>{release=resolve});
const race = createApprovalController({check:async()=>pending,onState:()=>{}});
const attempt=race.verify();
race.lock('denied');
release(true);
assert.equal(await attempt,false,'late approved server response must never unlock a closed gate');
assert.equal(race.getState(),'denied');
let calls=0;
const stopped=createApprovalController({check:async()=>{calls++;return true},onState:()=>{}});
stopped.stop();
assert.equal(await stopped.verify(),false);
assert.equal(calls,0,'stopped approval controller must not issue verification calls');
console.log('SW2 late-response and stop security tests passed');
