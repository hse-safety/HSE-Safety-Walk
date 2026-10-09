// SW2 staging adapter for Safety Walk's existing authenticated loader.
// Verified from the saved HSE-Safety-Walk-Desktop-Login.html:
// Existing login uses the production Supabase Auth session, fetches a signed
// URL for safety-app/app-v137.html, then document.open/write/close.
// It does NOT load safety-modules/onsite-v1.0.html for this button.
const ADDONS = [
  '<script type="module" data-sw2-app-gate src="./sw2/app-approval-gate.mjs"></'+'script>',
  '<script type="module" data-sw2-secure-export src="./sw2/secure-export.mjs"></'+'script>'
];
export function prepareSafetyWalkAppHtml(html) {
  if(typeof html!=='string'||!/<html[\\s>]/i.test(html)||!/<\\/body>/i.test(html))
    throw new Error('Invalid Safety Walk app HTML');
  if(html.includes('data-sw2-secure-export')) throw new Error('This module already has SW2 integration');
  return html.replace(/<\\/body>/i,ADDONS.join('')+'</body>');
}
// Intended integration point in the *actual existing login source*, following
// the successful signed URL fetch; retain existing login, profile checks and UI:
// const html = prepareSafetyWalkAppHtml(await r.text());
// document.open(); document.write(html); document.close();
// No installation may proceed until the real safety-login.html source is
// restored from a verified live/archived version; GitHub's copy is empty.
