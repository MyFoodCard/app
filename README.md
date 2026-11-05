# MyFoodCard

**Your food needs, in the local language.**

A mobile-first restaurant card for dietary requirements and food allergies. The card translates into the selected language; setup controls are currently in English.

## First version

- Personal profile saved locally in the browser; no application account or server database.
- Separate allergy and dietary sections. Fifteen allergen categories, including flaxseed/linseed; vegan, vegetarian, halal, kosher, gluten-free, no pork and no alcohol requirements.
- English, Slovak, Czech, German, French, Spanish, Arabic (RTL) and Thai card packs bundled offline.
- Compact restaurant card and readable presentation view; print/PDF through the browser and JSON profile export/import.
- Copy a shareable link containing the selected requirements and card language. Recipients view the shared card without changing their saved profile, and can explicitly choose to adopt it.
- System-aware light/dark appearance with a saved manual override. Printed cards always use the light palette.
- Opt-in device location and offline point-in-polygon country lookup. The user confirms a suggested language; unsupported countries never silently default to a supposed local language.
- Service worker pre-caches the complete application and map. Wait for the **Ready offline** indicator before travel. Install through the browser's add-to-home-screen flow.

This is a functional early prototype. Translations are authored drafts and have **not** undergone professional linguistic or clinical review. Review all allergy wording and localized food terminology before real-world reliance. A card does not establish a restaurant's ability to prepare a suitable meal.

## Development

Zero third-party runtime dependencies; standard HTML, CSS and JavaScript modules. No build step.

Requires Node 18+ for checks:

```sh
npm test
npm run check
```

Serve `dist/` with any static HTTP server, for example `python3 -m http.server 8000 --directory dist`. Service workers and location require HTTPS or localhost. Managed ChatGPT previews use the platform preview command instead.

Static hosting must serve the files without rewriting asset requests to HTML. The manifest uses relative URLs. When changing bundled assets, bump `CACHE` in `dist/sw.js` so installed users receive the new bundle. Publish all files atomically. The service worker serves its cached HTML and assets as one bundle. Early registration in the page head checks for updates independently of app initialization and reloads existing controlled pages when a new worker takes over.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` runs the tests and syntax checks, then publishes only `dist/` on pushes to `main`. It can also be run manually from the Actions tab.

One-time repository setup: open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**. If an earlier run failed before this setting was enabled, rerun it from Actions.

The project URL is `https://myfoodcard.github.io/app/` once deployment succeeds. Manifest URLs and assets are relative; the offline cache is scoped to the hosting path. The GitHub Pages website is public. Profiles remain in each visitor's browser; account login and cloud sync are not implemented yet.

## Privacy and offline behavior

Profile data is in `localStorage` under `myfoodcard.profile.v1`. Appearance is stored separately under `myfoodcard.theme.v1` and is not included in profile exports. The app does not upload profiles or coordinates to a backend. A shared link deliberately includes an encoded snapshot of food preferences and language in the URL fragment (the part after `#`), which browsers do not include in HTTP requests to the static host. Anyone who receives the complete link can decode its contents; it is not encrypted, cannot be revoked, and does not update when the sender changes their profile. The link may also be retained in messaging and browser history. The hosting provider still receives normal page/asset requests. Browser geolocation itself may use the browser/OS location provider. No location is persisted by this app.

The first visit needs connectivity. Browser storage can be cleared or evicted; export a backup. Private hosting may require a sign-in to open the initial online page. The app shell is cached locally and should not be treated as an authentication-protected vault.

No free-text medical notes are silently translated. The shipped vocabulary is explicit and finite. Sample mode is labeled and does not overwrite a saved profile.

Location lookup uses generalized Natural Earth 1:110m polygons. Coastal locations, small islands and borders may not resolve correctly. A country does not determine which language restaurant staff understand. Manual language selection is always available.

## Source layout

- `dist/app.js`: UI, storage, import/export, location workflow.
- `dist/domain.js`: profile validation and geography logic.
- `dist/sharing.js`: versioned share-link encoding and strict decoding.
- `dist/theme.js`: first-paint theme, system preference changes and saved appearance.
- `dist/translations.js`: card language catalog.
- `dist/sw.js`: offline cache lifecycle.
- `dist/countries.json`: compact Natural Earth geometry.
- `test/domain.test.js`: validation, translation coverage, known-location checks and offline service-worker behavior.

## Attribution and review references

Geography: [Natural Earth](https://www.naturalearthdata.com/), public domain under its [terms](https://www.naturalearthdata.com/about/terms-of-use/). Derived from [ne_110m_admin_0_countries.geojson](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Display names and boundaries are approximate and do not express a political position.

Card design reference: FARE's guidance on [chef cards](https://www.foodallergy.org/resources/food-allergy-chef-cards) and [avoiding cross-contact](https://www.foodallergy.org/resources/avoiding-cross-contact). Text here is original and is not endorsed by FARE.

## Before a public release

Professional translation review with ingredient terminology in each supported locale; allergy/clinical content review; iOS and Android installation and airplane-mode checks; accessibility review; per-allergen specificity and dietary requirement detail; localization of the profile editor. Decide the project's license and hosting/sharing policy with the owner before public distribution.

