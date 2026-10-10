import assert from 'node:assert/strict';
import {readDatabaseResponse} from '../supabase/functions/sw2-license/rest-response.mjs';
assert.equal(await readDatabaseResponse(new Response(null,{status:201})),null);
assert.equal(await readDatabaseResponse(new Response(null,{status:204})),null);
assert.deepEqual(await readDatabaseResponse(new Response('[{"status":"pending"}]',{status:201})),[{status:'pending'}]);
assert.equal(await readDatabaseResponse(new Response('null')),null);
await assert.rejects(()=>readDatabaseResponse(new Response('{"error":"denied"}',{status:403})));
await assert.rejects(()=>readDatabaseResponse(new Response('invalid',{status:200})));
console.log('PASS: empty successful insert/update responses, JSON representations and fail-closed errors');
