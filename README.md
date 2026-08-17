# HSE Safety Walk - GitHub Pages package

This folder contains the complete blank HSE Safety Walk web app for GitHub Pages.

## Upload these files to the repository root

- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `.nojekyll`

Do not upload completed Safety Walk reports, site photographs, names, observations or other inspection data to the public repository. The repository should contain only the blank template and its static app files.

## GitHub Pages setup

1. Create a GitHub repository, or open the repository you already use for the Safety Walk.
2. Upload all files listed above to the top level of the repository. `index.html` must be at the root.
3. Commit the files to the `main` branch.
4. Open **Settings > Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/(root)**, then save.
7. When GitHub Pages has published the site, use **Visit site** in the Pages settings.

## iPhone workflow

1. Open the GitHub Pages URL in Safari.
2. Use Safari Share > Add to Home Screen if you want the Safety Walk as a home-screen app.
3. Complete the Safety Walk and add photos.
4. The app compresses inserted photos before storing them in the form.
5. Tap **AirDrop** when the report is complete.
6. Choose the iMac.

## iMac PDF workflow

1. Accept the AirDropped `.html` file on the iMac.
2. Open the received HTML file in Google Chrome or Microsoft Edge.
3. The AirDropped copy contains a visible **PDF** button.
4. Click **PDF** and wait while the report is rendered.
5. The completed file is downloaded as `HSE Safety Walk.pdf`.
6. Check the PDF before distribution, especially portrait/landscape photos, observations, Best Practice and the Overall Conclusion.

## Updating the template later

Replace `index.html` with the new blank template. If app-shell files are changed, also increase the version in `sw.js` and the `?v=` values in `index.html`/`manifest.webmanifest` so iPhones do not remain on an older cached version.
