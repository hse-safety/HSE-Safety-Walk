# Safety Walk 2.0 production integration status – 2026-10-09

## Installed and verified in production (project hvgljbyethfwxajnrvvi)
- Migration `sw2_production_key_infrastructure_20261009` completed.
- Table `public.sw2_report_keys` exists with RLS; no direct anon/authenticated table access.
- Vault wrapping key `sw2_prod_report_wrap_v1` exists, generated server-side. Never put it in GitHub or client assets.
- RPC `public.sw2_internal_wrap_key()` exists; only `service_role` has EXECUTE. Verified database permissions.
- Edge Function `sw2-report-key` deployed ACTIVE with JWT verification and `profiles.active` approval checks.
- Staging branch `sw2/config.mjs` points to this same production Supabase project as the verified live Safety Walk login.
- CI run #12 passed all staging static/Node regression tests:
  https://github.com/hse-safety/HSE-Safety-Walk/actions/runs/37968529198

## NOT YET DEPLOYED OR VERIFIED
- Live login page has NOT been replaced; the active On-Site module is still `onsite-v1.0.html`.
- Native `onsite-v2.0.html` is in the staging branch, not the live private Storage bucket.
- Browser/iPhone/Mac tests for complete login→SEND→AirDrop→open→edit→save→PDF have NOT been completed.
- End-to-end approval tests for **a real production user**, second approved user, blocked user, network failure and rollback remain mandatory.
- No general release. The GitHub PR #1 stays in DRAFT and must not be merged until approved.

## Immediate controlled rollout checklist
1. Set up isolated HTTPS preview without changing live login or production module, using the already prepared user-upload-derived staging HTML.
2. Confirm existing Auth session and no extra login on On-Site. Test production Edge Function with approved and revoked test accounts.
3. Complete Safari iPhone and Firefox Mac feature and negative tests, including photo, PDF, AirDrop and encrypted HTML re-save.
4. Back up the current live login and Storage module. Deploy the new private object `onsite-v2.0.html` as a **new** object, never overwrite `onsite-v1.0.html`.
5. Switch the verified login source's On-Site file reference only after the E2E tests pass and release is approved. Preserve KVI and all existing roles/access rules.
6. Confirm PWA cache propagation and prepare immediate rollback of the On-Site reference to v1.0.

The backend migration alone is additive and does not activate Safety Walk 2.0 for users.

## Preview fix 2026-10-09
- `sw2-preview-cors` v2 deployed. It checks Supabase auth and `profiles.active` directly before serving On-Site 2.0; avoids broken `/sw2-preview/module` upstream (404).
- Caveat: staging GitHub repository is public; its raw `onsite-v2.0.html` is publicly fetchable. This preview is suitable only for functional tests with non-sensitive test inspections. **It does not satisfy private-module anti-copy deployment requirements.** Before full release move On-Site into authenticated private Storage or packaged private edge assets. No confidential real inspections in preview.
