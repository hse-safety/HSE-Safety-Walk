/* Safety Walk 2.0 encrypted-carrier format. No report decryption secrets in this module. */
export const PROTOCOL = 'sw2-encrypted-report-v1';
const enc = new TextEncoder(), dec = new TextDecoder('utf-8',{fatal:true});
const MAX_CHARS = 190_000_000;
export function bytesToBase64(bytes) {
  let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);
}
export function base64ToBytes(str) {
  if(typeof str!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(str))throw Error('Invalid base64');
  return Uint8Array.from(atob(str),c=>c.charCodeAt(0));
}
function uuid(str){return typeof str==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(str);}
export function validatePackage(p){
  if(!p||p.type!==PROTOCOL||!uuid(p.id)||typeof p.iv!=='string'||typeof p.data!=='string')throw Error('Not a Safety Walk 2.0 protected report');
  if(base64ToBytes(p.iv).length!==12||p.data.length<24||p.data.length>MAX_CHARS)throw Error('Invalid encrypted report');
}
export async function encryptHtml(html){
  if(typeof html!=='string'||!/<html[\s>]/i.test(html))throw Error('Invalid HTML inspection');
  const id=crypto.randomUUID(),secret=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['encrypt']);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(id)},key,enc.encode(html)));
  return {package:{type:PROTOCOL,id,iv:bytesToBase64(iv),data:bytesToBase64(cipher)},key:bytesToBase64(secret)};
}
export async function decryptHtml(p,keyB64){
  validatePackage(p);
  const secret=base64ToBytes(keyB64);if(secret.length!==32)throw Error('Invalid report key');
  const key=await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['decrypt']);
  return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(p.iv),additionalData:enc.encode(p.id)},key,base64ToBytes(p.data)));
}
export function buildCarrierHtml(p,viewerUrl){
  validatePackage(p);
  const u=new URL(viewerUrl);if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))throw Error('HTTPS viewer required');
  const url=u.href.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const data=JSON.stringify({type:p.type,id:p.id,iv:p.iv,data:p.data});
  return '<!doctype html><html lang="da"><meta charset="utf-8"><title>Safety Walk 2.0 – Krypteret rapport</title><main style="font:18px system-ui;max-width:680px;margin:10vh auto"><h1>Safety Walk 2.0</h1><p>Denne rapport er krypteret. Kun godkendte Safety Walk-brugere kan åbne den.</p><a target="_blank" rel="noopener noreferrer" href="'+url+'">Åbn Safety Walk rapportåbner</a><p>Vælg derefter denne HTML-fil.</p></main><script type="application/json" id="sw2-payload">'+data+'</script></html>';
}
export function readCarrierHtml(html){
  if(typeof html!=='string'||html.length>MAX_CHARS)throw Error('Invalid file');
  const m=html.match(/<script\s+type="application\/json"\s+id="sw2-payload">([\s\S]*?)<\/script>/i);
  if(!m)throw Error('Not a Safety Walk 2.0 report');
  const p=JSON.parse(m[1]);validatePackage(p);return p;
}
