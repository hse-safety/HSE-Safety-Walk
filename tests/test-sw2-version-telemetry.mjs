import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const storage=new Map(),events=[],listeners=new Map();
let replaced=false;
const context=vm.createContext({navigator:{userAgent:'iPhone',onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener:(k,v)=>listeners.set(k,v)},document:{documentElement:{classList:{remove(){}}},open(){listeners.clear();replaced=true},write(){},close(){}},Date,Set,Promise,console});
const telemetry=new vm.SourceTextModule(readFileSync('sw2/client-version-telemetry.mjs','utf8'),{context});await telemetry.link(()=>{});await telemetry.evaluate();
let release,block=false;
const client={rpc:async(name,args)=>{assert(replaced);events.push(args);if(block){block=false;await new Promise(r=>release=r)}return {error:null}}};
const dependencies={
 './licensing.mjs':{loadPrivateApp:async()=>'<html><head></head><body data-sw2-app-gate>SW2ReportExport.shareSnapshot</body></html>',forgetApproval(){},rememberIdentity:async()=>{},offlineIdentity:async()=>({userId:'test'}),selectModule(){}},
 './prepare-licensed-module.mjs':{prepareLicensedModule:s=>s},
 './auth.mjs':{sw2Client:client}
};
const launcher=new vm.SourceTextModule(readFileSync('sw2/launch.mjs','utf8'),{context});
await launcher.link(async spec=>{if(spec==='./client-version-telemetry.mjs')return telemetry;const values=dependencies[spec];return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context})});await launcher.evaluate();
await launcher.namespace.openLicensedOnsite({userId:'test'},'onsite');await telemetry.namespace.flushClientVersions(client,'test');
assert.equal(events[0].p_device,'iPhone');assert.equal(events[0].p_version,'2.0');assert.equal(events[0].p_module,'On-Site');
context.navigator.onLine=false;context.navigator.userAgent='Macintosh';
await launcher.namespace.openLicensedOnsite({userId:'test'},'facility');assert.equal(events.length,1);
context.navigator.onLine=true;listeners.get('online')();await telemetry.namespace.flushClientVersions(client,'test');assert.equal(events[1].p_device,'Mac');assert.equal(events[1].p_module,'KVI Premises');
block=true;telemetry.namespace.logClientVersion(client,'login',null,'test');await new Promise(r=>setImmediate(r));telemetry.namespace.logClientVersion(client,'module','On-Site','test');release();await telemetry.namespace.flushClientVersions(client,'test');assert.equal(events.at(-1).p_event,'module');assert.equal(events.length,4);
context.navigator.maxTouchPoints=5;assert.equal(telemetry.namespace.deviceLabel(),'iPad');
console.log('PASS: registration after document replacement; iPhone/Mac version and device; offline reconnect; concurrent event preservation; iPad recognition');
