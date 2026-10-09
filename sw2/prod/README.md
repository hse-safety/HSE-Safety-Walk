# SW2 production key infrastructure (review-only)
This folder contains production deployment **source**. It has not been installed.
1. Require backup, release approval and a preflight rollback plan.
2. Generate fresh random 32 bytes, Base64 encode and save only in Supabase Vault as `sw2_prod_report_wrap_v1` (no secrets in GitHub).
3. Review/apply `001_sw2_keys.sql` through migration tooling.
4. Deploy `sw2-report-key` from the already tested TEST implementation against the production project; keep JWT verification and `profiles.active` check.
5. Validate status/register/open, inactive user 403, failed/offline operation, modified carrier rejection, two separate approved users opening the same report.
6. Only then wire production config, publish reviewed `onsite-v2.0.html` privately and deploy new verified login with rollback.
**Do not modify On-Site v1 or KVI v1 storage objects.** Existing encrypted test reports are not transferable: prod has a fresh wrapping key.
