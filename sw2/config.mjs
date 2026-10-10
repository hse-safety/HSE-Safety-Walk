// SW2 protected report staging integration against the existing Safety Walk PROD login.
// This file is ONLY on the unmerged development branch, not live GitHub Pages.
// Credentials here are Supabase publishable keys, NEVER service-role keys.
export const SUPABASE_URL = 'https://hvgljbyethfwxajnrvvi.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pMvJE0yUfBC9KhPl43WGrQ_dUCERa3c';
export const REPORT_KEY_ENDPOINT = SUPABASE_URL + '/functions/v1/sw2-report-key';
export const REPORT_VIEWER_URL = new URL('./report-viewer-v2.html', import.meta.url).href;
