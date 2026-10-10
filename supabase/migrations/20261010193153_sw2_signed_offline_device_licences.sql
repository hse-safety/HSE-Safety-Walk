-- Additive 2.0 infrastructure. Does not change existing users, devices, module policies or 1.0.
CREATE SCHEMA IF NOT EXISTS sw2_private;
REVOKE ALL ON SCHEMA sw2_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA sw2_private TO service_role;
CREATE TABLE IF NOT EXISTS public.sw2_devices (
 device_id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 public_key_jwk jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),
 label text NOT NULL DEFAULT 'Safety Walk device',
 created_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,
 approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 last_seen_at timestamptz,
 CONSTRAINT sw2_device_public_key CHECK(public_key_jwk->>'kty'='EC' AND public_key_jwk->>'crv'='P-256' AND length(public_key_jwk->>'x')=43 AND length(public_key_jwk->>'y')=43 AND NOT(public_key_jwk?'d'))
);
CREATE INDEX IF NOT EXISTS sw2_devices_user_idx ON public.sw2_devices(user_id);
ALTER TABLE public.sw2_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sw2_devices FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sw2_devices TO service_role;
CREATE TABLE IF NOT EXISTS public.sw2_device_challenges (
 challenge uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 device_id uuid NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sw2_challenges_expiry_idx ON public.sw2_device_challenges(expires_at);
ALTER TABLE public.sw2_device_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sw2_device_challenges FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.sw2_device_challenges TO service_role;
CREATE OR REPLACE FUNCTION sw2_private.signing_material(candidate jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE material text;
BEGIN
 PERFORM pg_advisory_xact_lock(72643021);
 SELECT decrypted_secret INTO material FROM vault.decrypted_secrets WHERE name='sw2_offline_signing_v1' LIMIT 1;
 IF material IS NULL AND candidate IS NOT NULL THEN
  IF candidate->>'kty'<>'EC' OR candidate->>'crv'<>'P-256' OR length(candidate->>'d')<>43 OR length(candidate->>'x')<>43 OR length(candidate->>'y')<>43 THEN
   RAISE EXCEPTION 'Invalid signing key';
  END IF;
  PERFORM vault.create_secret(candidate::text,'sw2_offline_signing_v1','Safety Walk 2.0 server-only offline lease signing key');
  material:=candidate::text;
 END IF;
 RETURN material::jsonb;
END
$body$;
REVOKE ALL ON FUNCTION sw2_private.signing_material(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION sw2_private.signing_material(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.sw2_signing_material(candidate jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=''
AS 'SELECT sw2_private.signing_material(candidate)';
REVOKE ALL ON FUNCTION public.sw2_signing_material(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sw2_signing_material(jsonb) TO service_role;
