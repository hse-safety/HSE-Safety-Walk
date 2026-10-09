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
