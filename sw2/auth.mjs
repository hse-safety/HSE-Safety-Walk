import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, REPORT_KEY_ENDPOINT } from './config.mjs';
export const sw2Client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
// Reject a session belonging to a different Supabase project, even if a
// cached session exists. This catches accidental TEST/PROD configuration mixing.
export function sessionMatchesProject(session, baseUrl) {
  if (!session?.access_token) return false;
  try {
    const payload = session.access_token.split('.')[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g,'+').replace(/_/g,'/');
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'=')));
    const expectedIssuer = new URL('/auth/v1',baseUrl).href.replace(/\\/$/,'');
    return claims.iss === expectedIssuer &&
      claims.sub === session.user?.id &&
      typeof claims.exp === 'number' && claims.exp > Date.now()/1000;
  } catch {return false;}
}
export async function approvalApi(action,fields={}){
  const {data:{session},error}=await sw2Client.auth.getSession();
  if(error||!sessionMatchesProject(session,SUPABASE_URL))throw Error('Safety Walk session does not match the configured project. Login required.');
  const response=await fetch(REPORT_KEY_ENDPOINT,{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({action,...fields})
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||'Safety Walk approval failed ('+response.status+')');
  return body;
}
