// Safety Walk 2.0 staging: guard the existing private app loader.
// This helper refuses to retrofit the old 1.0 module: injecting a script
// does not alter 1.0's SEND handler and would permit cleartext exports.
// Deploy the FULL reviewed, modified app-v137.html as a new private 2.0
// storage object and point the verified login loader at it only on release.
export function prepareSafetyWalkAppHtml(html) {
  if (typeof html !== 'string' || !/<html[\\s>]/i.test(html) || !/<\\/body>/i.test(html)) {
    throw new Error('Invalid Safety Walk app HTML');
  }
  const native2 = html.includes('data-safety-walk-version="2.0-staging"') &&
    html.includes('data-sw2-secure-export') &&
    html.includes('SW2ReportExport.protectSnapshot(clearHtml)');
  if (!native2) {
    throw new Error('The private app module has not been updated to Safety Walk 2.0. No export allowed.');
  }
  return html;
}
