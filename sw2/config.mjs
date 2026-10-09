// STAGING ONLY: never merge this TEST configuration into main.
export const SUPABASE_URL = 'https://lsczcfpwvhtnbqckjlhv.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lN8HekUN8mkVfMdzmPnZJQ_DqJ9VhEy';
export const REPORT_KEY_ENDPOINT = SUPABASE_URL + '/functions/v1/sw2-report-key';
export const REPORT_VIEWER_URL = new URL('./report-viewer-v2.html', import.meta.url).href;
