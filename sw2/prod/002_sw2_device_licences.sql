-- Additive Safety Walk 2.0 device-approval registry. Does NOT change current users or login.
-- Only privileged Edge Functions (service_role) may read or write this table.
CREATE TABLE IF NOT EXISTS public.sw2_devices (
  device_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key_jwk jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_seen_at timestamptz,
  CONSTRAINT sw2_device_public_key CHECK (
    public_key_jwk->>'kty' = 'EC' AND
    public_key_jwk->>'crv' = 'P-256' AND
    length(public_key_jwk->>'x') BETWEEN 42 AND 44 AND
    length(public_key_jwk->>'y') BETWEEN 42 AND 44 AND
    NOT (public_key_jwk ? 'd')
  )
);
CREATE INDEX IF NOT EXISTS sw2_devices_user_idx ON public.sw2_devices(user_id);
ALTER TABLE public.sw2_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sw2_devices FROM PUBLIC, anon, authenticated;
-- Only the server accesses the registry, enforcing current profiles.active,
-- safety_access.allow_onsite, and per-device approval on EVERY online check.
