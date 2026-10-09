"""Browser smoke test of the REAL encrypted report viewer in Chromium.
Supabase is mocked here; this is not a production-credential or Safari test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parent.parent
fake_auth="""window.__sw2Fake={approved:true,signedIn:false,keys:{}};
const auth={getUser:async()=>({data:{user:window.__sw2Fake.signedIn?{id:'test-only'}:null}}),signInWithPassword:async()=>{window.__sw2Fake.signedIn=true;return {error:null}},signOut:async()=>{window.__sw2Fake.signedIn=false;return {error:null}}};
export const sw2Client={auth};
export async function approvalApi(action,fields={}){if(!window.__sw2Fake.signedIn||!window.__sw2Fake.approved)throw Error('Access Denied');if(action==='status')return {approved:true};if(action==='open'){let key=window.__sw2Fake.keys[fields.report_id];if(!key)throw Error('Unknown report');return {key_b64:key}}if(action==='register'){window.__sw2Fake.keys[fields.report_id]=fields.key_b64;return {registered:true}}throw Error('Bad action')}
"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page(accept_downloads=True)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def route(req):
  part=req.request.url.split('https://safetywalk.example/')[1].split('?')[0]
  if part=='sw2/auth.mjs':
   return req.fulfill(status=200,content_type='text/javascript',body=fake_auth)
  target=(repo/part).resolve()
  if not target.is_relative_to(repo) or not target.is_file():
   return req.fulfill(status=404,body='not found')
  mime='text/javascript' if target.suffix=='.mjs' else 'text/html'
  return req.fulfill(status=200,content_type=mime,body=target.read_bytes())
 page.route('https://safetywalk.example/**',route)
 page.goto('https://safetywalk.example/sw2/report-viewer-v2.html')
 page.locator('#loginScreen').wait_for(state='visible')
 page.locator('#email').fill('test@example.invalid')
 page.locator('#password').fill('test')
 page.locator('#loginForm button').click()
 page.locator('#pickScreen').wait_for(state='visible',timeout=15000)
 report='<!doctype html><html><body><h1 id="report-title">Test inspection</h1><textarea id="notes">Original</textarea></body></html>'
 carrier=page.evaluate('''async html=>{let m=await import('./report-core.mjs');let r=await m.encryptHtml(html);window.__sw2Fake.keys[r.package.id]=r.key;return m.buildCarrierHtml(r.package,location.href)}''',report)
 assert 'Original' not in carrier
 page.locator('#reportFile').set_input_files({'name':'SW2-protected.html','mimeType':'text/html','buffer':carrier.encode()})
 page.locator('#openReport').click()
 page.locator('#viewerScreen').wait_for(state='visible',timeout=15000)
 frame=page.frame_locator('#inspectionFrame')
 frame.locator('#report-title').wait_for(state='visible',timeout=10000)
 assert frame.locator('#notes').input_value()=='Original'
 frame.locator('#notes').fill('Edited')
 assert frame.locator('#notes').input_value()=='Edited'
 page.evaluate('window.__sw2Fake.approved=false;window.dispatchEvent(new Event("online"))')
 page.locator('#viewerScreen').wait_for(state='hidden',timeout=15000)
 assert not page.locator('#inspectionFrame').get_attribute('srcdoc')
 assert not errors,errors
 print('PASS: real viewer authentication, AES-GCM open, editable iframe and revoked-session lock')
 browser.close()
