import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, REPORT_KEY_ENDPOINT } from './config.mjs';
export const sw2Client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
export async function approvalApi(action,fields={}){
  const {data:{session},error}=await sw2Client.auth.getSession();
  if(error||!session?.access_token)throw Error('Safety Walk login required');
  const response=await fetch(REPORT_KEY_ENDPOINT,{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({action,...fields})
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'Safety Walk approval failed ('+response.status+')');
  return body;
}
