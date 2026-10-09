// Safety Walk 2.0: pure adapter for the private HTML module loaded after existing login.
// Important: this must be called in safety-login.html AFTER the existing signed-URL fetch.
// Do NOT use it on the public 1.0 login or on unrelated modules.
const SECURE_EXPORT = '<script type="module" data-sw2-secure-export src="./sw2/secure-export.mjs"></'+'script>';
const APPROVAL_GATE = '<script type="module" data-sw2-app-gate src="./sw2/app-approval-gate.mjs"></'+'script>';
export function prepareOnsitePrivateModule(html) {
  if (typeof html !== 'string' || !/<html[\s>]/i.test(html)) throw new TypeError('Invalid private module HTML');
  if (!/<\/body>/i.test(html)) throw new Error('Private module missing body');
  // Avoid double installation after user clicks the module again.
  if (html.includes('data-sw2-secure-export')) throw new Error('SW2 module is already integrated');
  return html.replace(/<\/body>/i, APPROVAL_GATE + SECURE_EXPORT + '</body>');
}
// Integration site in safety-login.html:
//   let html = await r.text();
//   if (fileName === ONSITE_APP_FILE) html = prepareOnsitePrivateModule(html);
// Keep the existing profile, module-access check, identity and document.write flow intact.
