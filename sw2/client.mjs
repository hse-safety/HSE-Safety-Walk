import {createClient} from './vendor/supabase-client.mjs';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.mjs';
// Share one auth client and refresh lifecycle between login and licensing.
export const sw2Client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
