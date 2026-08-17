# HSE Safety Walk – GitHub overwrite package v132

Upload **all files in this folder** to the root of the existing GitHub repository and overwrite the old files.

## v132 fixes
- `Add OBS` creates a manual Safety Observation and scrolls directly to it.
- `Add Best` creates a Best Practice card and scrolls directly to it.
- `Clear photos` removes all current photos and immediately saves the photo-free state.
- `Clear all` is a hard reset: all text, checks, photos, OBS, Best Practice cards, counters, generated print content and old local Safety Walk IndexedDB data are removed.
- After `Clear all`, a clean blank autosave state is written so an old report cannot reappear after closing/reopening the iPhone app.
- Old HSE Safety Walk service-worker caches are retired; the app uses the current GitHub Pages files.

## GitHub
1. Open the existing repository.
2. **Add file > Upload files**.
3. Upload every file from this folder to the repository root.
4. Choose **Replace/overwrite** for existing files and commit to `main`.
5. Wait for GitHub Pages to finish deploying.

## First iPhone test after v132
1. Open the GitHub Pages URL in Safari while online.
2. If you already have the home-screen app, close it completely and reopen it once.
3. Press **Clear all** once and confirm.
4. Close the app, reopen it: it must still be blank.
5. Test **Add OBS** and **Add Best**; each tap must create one card and move the screen to it.
6. Add a test photo, press **Clear all**, close/reopen the app: the photo must not return.

The blank GitHub repository should contain only the template/app assets – never completed inspection reports or site photos.
