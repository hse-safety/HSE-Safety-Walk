// Production release candidate only. Not active until reviewed and wired into config.mjs.
// Public anon/publishable API key; never place service_role or Vault secrets in client files.
// Values match the user's verified live Safety Walk login.
export const SUPABASE_URL = 'https://hvgljbyethfwxajnrvvi.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pMvJE0yUfBC9KhPl43WGrQ_dUCERa3c';
export const REPORT_KEY_ENDPOINT = `${SUPABASE_URL}/functions/v1/sw2-report-key`;
export const REPORT_VIEWER_URL = new URL('./report-viewer-v2.html', import.meta.url).href;
// Release preconditions: deploy and test production report-key function,
// database/RPC migration, and use the real verified Supabase Auth login session.
// Do not activate before those checks and the final iPhone test.
