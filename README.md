# HSE Safety Walk – GitHub overwrite package

Upload/overwrite **all files in this folder** in the root of the existing GitHub repository.

Files:
- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `.nojekyll`

This build includes:
- iPhone Add OBS and Add Best buttons
- iPhone-safe photo add icons (no emoji/font dependency)
- AirDrop on iPhone / PDF on Mac
- persistent iPhone draft autosave
- removal of legacy service-worker caches to prevent stale app versions

After uploading to GitHub, wait for GitHub Pages to publish. On iPhone, remove the old Home Screen shortcut once, open the GitHub Pages URL in Safari, and add it to Home Screen again.
