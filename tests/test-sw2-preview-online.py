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
 print('PASS: preview HTTPS login renders, CORS preflight works, private module rejects anonymous users')
 browser.close()
