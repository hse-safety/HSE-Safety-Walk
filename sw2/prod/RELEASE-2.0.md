# Safety Walk 2.0 — simple user approval release

This release uses the original private onsite-v1.0.html and kvi-premises-v1.0.html as its inspection source. Original inspection markup, notes, photographs, observations, identity fields and PDF code are retained. Security hooks and the displayed version are applied when the authorised module is loaded.

The active profile and module approval in User Management authorise every online operation. There is no administrator approval for each device, and the new online flow does not register a server device entry. Non-exportable local keys retain encrypted offline caches and verify the signed maximum 24-hour offline lease silently.

Encrypted report keys remain in the existing protected key table. Reports themselves stay on the user's device. Previously opened reports and modules work offline until expiry; offline report-key registrations synchronise after approved reconnection. The first opening of a report on a receiving computer needs an online check.

SEND prepares an encrypted file in the background, then invokes the native share API directly in the tap. If preparation has not finished after a recent change, the same SEND button asks for another tap once ready. Stale report contents are never shared. Browser refusal to share still downloads only encrypted HTML. Desktop HTML retains its PDF controls.

Backend: sw2-license-simple. Existing private 1.0 files, user accounts and access selections are not overwritten. The installed PWA identity is retained; close and restart to load the new shell.

Verification includes central approval/revocation, encryption, lease expiry, module permissions, V1 inspection markup and synchronous sharing tests. WebKit tests use isolated mock users for local cache encryption, offline app/report access and reconnect synchronisation. Production health checks both actual private V1 modules without exposing their contents. Native iPhone Mail/AirDrop completion requires the user's device and is not claimed as an automated test.

The older notes below describe the superseded device-approval design and are retained as history.

---

# Previous device-approval release

This release adds only licensing/device approval and cryptographic access controls. The login body, inspection content, workflows, existing app share/export and desktop PDF controls remain unchanged. KVI retains its existing module route.

## Implemented

- Central active-user and On-Site approval checks plus administrator-approved per-browser device keys.
- Device private signing and AES cache keys are non-exportable CryptoKeys held in IndexedDB.
- Every online licence, module and report-key operation requires a fresh, single-use server challenge signed by the approved device. New devices are pending until approved in User Management.
- ES256 leases permit at most 24 hours offline. They bind the user, project, device ID and public key. Expiry, tampering, wrong device/key and clock rollback fail closed.
- The app module and cached report keys are encrypted in device storage. Copied HTML/carriers and cache ciphertext do not contain decryption keys.
- Previously opened reports work offline on the approved device until lease expiry. A report needs its first key retrieval online on each receiving device.
- Offline app exports stay encrypted. Their wrapped report-key registrations are queued in encrypted storage and synchronise after approved reconnection. Until synchronised, a newly receiving computer cannot retrieve that key. Pending records survive logout/revocation and are only synchronised after approval returns.
- Reconnection locks use until a fresh server check succeeds. Failed/revoked checks invalidate cached approval; no cached grant is used while the browser reports an internet connection.
- User Management gains device approve/revoke controls. These controls do not change inspection fields or create desktop SEND.
- Existing PWA identity/start URL is retained. Users close and restart the installed app to receive the release.

## Activation — one coordinated release, not a partial installation

1. Preserve current live login/manifest/runtime and the existing 2.0 Edge Function source as release backups. Do not overwrite private onsite-v1.0.html or change its Storage policy.
2. Apply `supabase/migrations/20261010193153_sw2_signed_offline_device_licences.sql` to the production project. It adds the isolated device/challenge registry and server-only Vault signing functions. Existing user approval/access and report wrapping keys are retained.
3. Deploy `supabase/functions/sw2-license/index.ts` plus `core.mjs` as `sw2-license`. JWT gateway verification is disabled only because the handler explicitly verifies user JWTs through Supabase Auth on every protected operation; its only anonymous operation returns the PUBLIC signing key.
4. Build with `node sw2/build-licensed-release.mjs --source=safety-login.html --out=dist-sw2` using the freshly retrieved real live source, then publish the built login, manifest, root `offline-sw.js`, and `sw2/` runtime together. No private inspection source is published to GitHub.
5. Replace legacy **2.0-only** `sw2-preview-cors` and `sw2-report-key` with `retired-legacy.ts` (HTTP 410). Without this step their old active-user-only route bypasses device approval. Safety Walk 1.0 does not use these two functions. Do not retire them before the full new client is published.
6. An active administrator signs in, opens User Management and approves registered devices, including their own device. Each user closes/restarts the installed app; their first device registration may require administrator approval.

The database signing secret is generated inside the server and never put in this repository or client files. The client trusts the fixed HTTPS public-key endpoint online and retains that public key in authenticated device storage offline. A release may optionally pin the public key in config.mjs.

## Validation boundary

Server cryptography and permission/expiry tests passed locally. The TEST project's licence function and restricted database/Vault infrastructure are installed; production infrastructure is activated and the full 2.0 client is published. Real Chromium integration passed in staging CI: non-exportable device keys, encrypted IndexedDB storage, copied-cache denial, offline app/report opening, encrypted key queue and reconnect synchronisation, licence expiry, user revocation, full PWA offline shell restart, and report decryption/editing/session lock. The local runtime cannot download its Chromium binary. Signed-in Safari/iPhone production execution is not claimed until performed after coordinated activation.

Offline revocation is necessarily delayed until reconnection or expiry. Browser storage/clock controls provide protection against normal copying and accidental clock changes, not a trusted hardware clock or a hostile modification of an already decrypted authorised session. PDFs and information already read by an authorised user cannot be recalled.
