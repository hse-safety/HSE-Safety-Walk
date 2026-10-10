from playwright.sync_api import sync_playwright
from urllib.parse import urlparse
URL='https://hse-safety.github.io/HSE-Safety-Walk/sw2-preview/'
API='https://hvgljbyethfwxajnrvvi.supabase.co/functions/v1/sw2-preview-cors'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page()
 response=page.goto(URL,wait_until='domcontentloaded',timeout=40000)
 assert response is not None and response.status==200, f'GH Pages status {response.status if response else "none"}'
 assert page.title().startswith('Safety Walk 2.0')
 assert page.locator('#loginForm').is_visible(), 'Preview login not rendered'
 assert not page.locator('body').inner_text().startswith('<!doctype'), 'Raw HTML instead of a page'
 preflight=page.request.fetch(API,method='OPTIONS',headers={
   'Origin':'https://hse-safety.github.io',
   'Access-Control-Request-Method':'GET',
   'Access-Control-Request-Headers':'authorization'
 },timeout=20000)
 assert preflight.status==204, f'CORS OPTIONS status {preflight.status}'
 assert preflight.headers.get('access-control-allow-origin')=='https://hse-safety.github.io'
 denied=page.request.get(API,timeout=20000)
 assert denied.status==401, f'Unauthenticated user unexpectedly received {denied.status}'
 assert 'onsite-v2.0' not in denied.text().lower(), 'Module must never be returned without authorization'
 key_api='https://hvgljbyethfwxajnrvvi.supabase.co/functions/v1/sw2-report-key'
 key_denied=page.request.post(key_api,data={'action':'status'},headers={'Content-Type':'application/json'},timeout=20000)
 assert key_denied.status in (401,403), f'Anonymous report key endpoint returned {key_denied.status}'
 assert 'key_b64' not in key_denied.text(), 'Key material exposed to anonymous requests'
 facility_api='https://hvgljbyethfwxajnrvvi.supabase.co/functions/v1/sw2-premises-preview'
 facility_denied=page.request.get(facility_api,timeout=20000)
 assert facility_denied.status==401, f'Anonymous Facility module returned {facility_denied.status}'
 facility_denied_status=page.request.get(facility_api+'?check=1',timeout=20000)
 assert facility_denied_status.status==401, f'Anonymous Facility permission status returned {facility_denied_status.status}'
 gate=page.request.get('https://hse-safety.github.io/HSE-Safety-Walk/sw2-premises-preview/sw2-premises-gate.mjs',timeout=20000)
 assert gate.status==200, f'Facility security gate returned {gate.status}'
 gate_source=gate.text()
 assert 'result.access?.office!==original.office' in gate_source
 assert 'result.access?.warehouse!==original.warehouse' in gate_source
 assert 'state(false)' in gate_source
 onsite_loader=page.request.get(URL,timeout=20000).text()
 assert "const SAFETY_WALK_VERSION = '2.0';" in onsite_loader, 'On-Site 2.0 label transformation missing'
 facility_loader=page.request.get('https://hse-safety.github.io/HSE-Safety-Walk/sw2-premises-preview/',timeout=20000)
 assert facility_loader.status==200
 assert 'Office / Warehouse Facility' in facility_loader.text()
 retired=page.request.get('https://hvgljbyethfwxajnrvvi.supabase.co/functions/v1/sw2-preview',timeout=20000)
 assert retired.status==410, f'Retired embedded-code endpoint returned {retired.status}'
 assert '<html' not in retired.text().lower(), 'Retired endpoint unexpectedly returned HTML'
 print('PASS: approvals, anonymous denial, Facility grant-change lock, preview version and retired legacy endpoint')
 browser.close()
