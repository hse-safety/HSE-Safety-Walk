const NAME='safety-walk-2-licensed-v1';
const ROOT=new URL('./',self.location.href);
const SHELL=new URL('index.html',ROOT).href;
const LOCAL=['index.html','manifest.webmanifest','sw2/auth.mjs','sw2/approval-response.mjs','sw2/config.mjs','sw2/licensing.mjs','sw2/device-store.mjs','sw2/offline-lease.mjs','sw2/app-approval-gate.mjs','sw2/secure-export.mjs','sw2/report-core.mjs','sw2/report-viewer-v2.html','sw2/prepare-licensed-module.mjs','sw2/launch.mjs','sw2/device-management.mjs'];
async function cacheModuleGraph(url,cache,seen=new Set()){
 if(seen.has(url))return;seen.add(url);
 const r=await fetch(url,{cache:'reload',mode:'cors'});if(!r.ok)throw Error('Offline dependency unavailable');
 await cache.put(url,r.clone());const source=await r.text();
 const imports=[...source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)].map(x=>x[1]);
 for(const spec of imports){const child=new URL(spec,url);if(child.origin===new URL(url).origin||child.origin==='https://cdn.jsdelivr.net')await cacheModuleGraph(child.href,cache,seen);}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(NAME);await cache.addAll(LOCAL.map(p=>new URL(p,ROOT).href));await cacheModuleGraph('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm',cache);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('safety-walk-2-licensed-')&&name!==NAME)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
 // Auth, licence, device approval, report keys and private module responses are NEVER cached.
 if(url.hostname.endsWith('.supabase.co'))return;
 if(url.origin===ROOT.origin&&url.pathname.startsWith(ROOT.pathname)){
  event.respondWith((async()=>{const cache=await caches.open(NAME);try{const r=await fetch(req,{cache:'no-store'});if(r.ok&&((req.mode==='navigate')||LOCAL.some(p=>new URL(p,ROOT).pathname===url.pathname)))await cache.put(req,r.clone());return r}catch{const cached=await cache.match(req,{ignoreSearch:true});if(cached)return cached;if(req.mode==='navigate')return await cache.match(SHELL);throw Error('Offline asset unavailable')}})());
 }else if(url.origin==='https://cdn.jsdelivr.net')event.respondWith((async()=>{const cache=await caches.open(NAME),cached=await cache.match(req);if(cached)return cached;const r=await fetch(req);if(r.ok)await cache.put(req,r.clone());return r})());
});
