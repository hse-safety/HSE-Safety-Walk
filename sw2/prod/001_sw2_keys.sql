-- Safety Walk 2.0 PROD deployment candidate (NOT APPLIED).
-- Run only through a reviewed production release. Does not change profiles.
-- One random 32-byte wrap key must be stored in Supabase Vault as
-- sw2_prod_report_wrap_v1 by privileged administrator before activating reports.
CREATE TABLE IF NOT EXISTS public.sw2_report_keys (
 report_id uuid PRIMARY KEY,
 nonce_b64 text NOT NULL,
 wrapped_key_b64 text NOT NULL,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT sw2_nonce_length CHECK (length(nonce_b64) = 16),
 CONSTRAINT sw2_wrapped_key_length CHECK (length(wrapped_key_b64) = 64)
);
ALTER TABLE public.sw2_report_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sw2_report_keys FROM anon, authenticated, PUBLIC;
-- No client access to the underlying table; service role only.
CREATE OR REPLACE FUNCTION public.sw2_internal_wrap_key()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $function$
 SELECT decrypted_secret FROM vault.decrypted_secrets
 WHERE name = 'sw2_prod_report_wrap_v1' LIMIT 1
$function$;
REVOKE ALL ON FUNCTION public.sw2_internal_wrap_key() FROM PUBLIC, anon, authenticated;
-- service_role can execute the SECURITY DEFINER function.
GRANT EXECUTE ON FUNCTION public.sw2_internal_wrap_key() TO service_role;
