import assert from 'node:assert/strict';
import { prepareSafetyWalkAppHtml } from '../sw2/private-module-bridge.mjs';
const unprotected='<!doctype html><html><head></head><body><button>SEND</button></body></html>';
assert.throws(()=>prepareSafetyWalkAppHtml(unprotected), /not been updated/);
assert.throws(()=>prepareSafetyWalkAppHtml('<html></html>'), /Invalid/);
const protectedApp='<!doctype html><html data-safety-walk-version="2.0-staging"><head></head><body><script data-sw2-secure-export></script><script>window.SW2ReportExport.protectSnapshot(clearHtml)</script></body></html>';
assert.equal(prepareSafetyWalkAppHtml(protectedApp),protectedApp);
console.log('SW2 private module bridge fail-closed checks passed');
