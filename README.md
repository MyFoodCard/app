# MyFoodCard

**Your food needs, in the local language.**

A mobile-first restaurant card for dietary requirements and food allergies. The app and card both support eleven languages (English, Slovak, Czech, German, French, Spanish, Arabic, Thai, Turkish, Indonesian and Filipino), with independent language selection. The app starts with the first supported browser language (English fallback); an explicit choice is remembered on the device.

## First version

- Install app opens a native browser prompt when offered; otherwise it shows translated iPhone/iPad, Safari on Mac, or browser-menu instructions. It is hidden when running as an installed app and after an install event. Dismissed prompts are not shown again automatically. PNG home-screen icons are included.

- Personal profile saved locally in the browser; no application account or server database.
- Two ingredient sections: **Must avoid** for allergies and required exclusions, and **Avoid if possible** for optional exclusions. Dietary requirements remain separate. No per-ingredient severity dropdowns.
- Each section uses one searchable catalog of 44 ingredients, including common allergens, flaxseed/linseed, additional seeds and legumes, individual nuts, white sugar, trehalose and lactose. Selected chips remain visible. Search or Browse all opens one scrollable list; selected ingredients are excluded from add results. Cross-contact instructions apply only to Must avoid. Adding an optional ingredient to Must avoid moves it there; it cannot appear in both sections.
- Vegan, vegetarian, halal, kosher, gluten-free, no pork and no alcohol requirements remain independent of ingredient exclusions. Selecting one ingredient never automatically selects related ingredients.
- English, Slovak, Czech, German, French, Spanish, Arabic (RTL) and Thai app and card packs bundled offline. Ingredient search accepts both translated names and English aliases.
- Preferences are the only inline workspace. A floating Show card button opens the restaurant presentation, which contains the language selector, location suggestion, QR code, Copy text and Copy link controls. The whole mobile top strip and non-interactive card header support swipe-down dismissal; language and location controls retain their normal behavior. Short drags cancel. The close button and Escape remain available. Closing a shared card returns to the visitor’s own preferences; adopting a shared profile remains explicit.
- Compact monospace interface with charcoal, lime, violet and coral colors; system-aware dark/light themes and a readable restaurant presentation. JSON profile export/import and native browser print remain available; there is no Print button.
- Copy a shareable link or scan the corner QR code containing the selected requirements and card language. Both open directly in the restaurant presentation with its sharing controls; closing it returns to your own preferences. Recipients’ saved profiles remain untouched unless they explicitly adopt the preferences. Tap the QR code to enlarge it, especially for longer profiles.
- Copy text produces a short summary in the current card language with distinct Must avoid and Avoid if possible lists, dietary labels and any cross-contact instruction. If clipboard access fails, a selectable text dialog is provided.
- System-aware light/dark appearance with a saved manual override. Printed cards always use the light palette.
- Opt-in device location and offline point-in-polygon country lookup. The user confirms a suggested language; unsupported countries never silently default to a supposed local language.
- Service worker pre-caches the complete application and map. Wait for the **Ready offline** indicator before travel. Install through the browser's add-to-home-screen flow.

This is a functional early prototype. Translations are authored drafts and have **not** undergone professional linguistic or clinical review. Review all allergy wording and localized food terminology before real-world reliance. A card does not establish a restaurant's ability to prepare a suitable meal.

## Development

Standard HTML, CSS and JavaScript modules with no build step or external runtime requests. A vendored copy of Project Nayuki’s QR encoder v1.8.0 (MIT) generates QR images locally. The pinned upstream commit is `720f62bddb7226106071d4728c292cb1df519ceb`; its license is retained in `dist/vendor/qrcodegen.js`. It was transpiled from the official TypeScript source using Node’s `stripTypeScriptTypes` transform, with one ES module export added. No compiler is needed to run or deploy the app.

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

Profile data is in `localStorage` under `myfoodcard.profile.v3`. Existing version 1 and 2 profiles migrate automatically: allergies and strict intolerances become Must avoid, and optional intolerances become Avoid if possible. Existing requirements are never silently weakened. Old keys are retained as backups so older open tabs cannot overwrite the migrated profile. Clear removes those backups too. JSON import and shared links accept versions 1, 2 and 3; new exports use version 3. Unknown food requirements and avoidance instructions are rejected rather than silently dropped. Appearance is stored separately under `myfoodcard.theme.v1`, and app language under `myfoodcard.app-language.v1`; neither is included in profile exports. Existing card languages are preserved when changing the app language. The app does not upload profiles or coordinates to a backend. A shared link deliberately includes an encoded snapshot of food preferences and language in the URL fragment (the part after `#`), which browsers do not include in HTTP requests to the static host. Anyone who receives the complete link can decode its contents; it is not encrypted, cannot be revoked, and does not update when the sender changes their profile. The link may also be retained in messaging and browser history. The hosting provider still receives normal page/asset requests. Browser geolocation itself may use the browser/OS location provider. No location is persisted by this app.

The first visit needs connectivity. Browser storage can be cleared or evicted; export a backup. Private hosting may require a sign-in to open the initial online page. The app shell is cached locally and should not be treated as an authentication-protected vault.

No free-text medical notes are silently translated. The shipped vocabulary is explicit and finite. Sample mode is labeled and does not overwrite a saved profile.

Location lookup uses generalized Natural Earth 1:110m polygons. If a point falls outside the polygons, nearby countries within 25 km of their mapped boundaries are offered as approximate suggestions, including multiple candidates when appropriate. This covers common coastal gaps without selecting a language automatically. Small islands, coarse device locations and places farther from the mapped boundaries may still need manual selection. A country does not determine which language restaurant staff understand. Manual language selection is always available.

## Source layout

- `dist/app.js`: UI, storage, import/export, location workflow.
- `dist/domain.js`: profile validation and geography logic.
- `dist/profile-storage.js`: local profile migration and version isolation.
- `dist/card.js`: shared card rendering and plain-text summaries.
- `dist/qr.js`, `dist/vendor/qrcodegen.js`: local QR rendering and vendored encoder.
- `dist/sharing.js`: versioned share-link encoding and strict decoding.
- `dist/theme.js`: first-paint theme, system preference changes and saved appearance.
- `dist/translations.js`, `dist/ingredient-translations.js`: card language catalog and ingredient vocabulary.
- `dist/install.js`: optional installation prompt, platform instructions and standalone detection.
- `dist/ui-translations.js`, `dist/i18n.js`: interface messages, browser-language negotiation, saved override and translated ingredient search.
- `dist/sheet-dismiss.js`: header swipe handling with control exclusions, cancellation and tap/keyboard alternatives.
- `dist/sw.js`: offline cache lifecycle.
- `dist/countries.json`: compact Natural Earth geometry.
- `test/`: profile migration, strict sharing/import validation, card instruction separation, translation coverage, known-location checks and offline service-worker behavior.

## Earlier requests and remaining work

Implemented: offline PWA with local profiles; opt-in location suggestions; manual language choice; eleven offline languages; dietary, ethical and religious requirements; Must avoid and Avoid if possible sections; compact card; dark mode; no name field or bottom card slogan; “Please share this information with the person preparing my food”; shareable preference snapshots; browser print/PDF; import/export; GitHub Pages deployment. Use without an account remains the default.

Not implemented yet:

- **Optional SSO and sync.** Requires a chosen and configured identity/storage provider. Login alone does not sync local data. Keep guest profiles usable offline; account connection and the first sync must be explicit, with a choice when local and remote profiles differ. No application backend is currently hosted.
- **Apple Wallet export.** Export one snapshot in the explicitly selected card language, optionally chosen after the existing location suggestion. Wallet uses a pass layout rather than the web card’s CSS. A usable `.pkpass` must be signed with an Apple-issued Pass Type ID certificate; issuance for arbitrary visitors needs a secure signing service or provider. No certificate/private key belongs in this public repository or browser bundle. Review front/back field visibility and long ingredient lists on an actual iPhone before release. The language should remain fixed when showing the pass to staff, rather than silently following the phone’s language. See [Apple’s Wallet requirements](https://developer.apple.com/wallet/get-started/).
- **Svelte migration.** Discussed, but not performed. The current app uses buildless HTML/CSS/JavaScript without Vue or a runtime dependency.

## Attribution and review references

Geography: [Natural Earth](https://www.naturalearthdata.com/), public domain under its [terms](https://www.naturalearthdata.com/about/terms-of-use/). Derived from [ne_110m_admin_0_countries.geojson](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Display names and boundaries are approximate and do not express a political position.

Card design reference: FARE's guidance on [chef cards](https://www.foodallergy.org/resources/food-allergy-chef-cards) and [avoiding cross-contact](https://www.foodallergy.org/resources/avoiding-cross-contact). Text here is original and is not endorsed by FARE.

## Before a public release

Professional translation review with ingredient terminology in each supported locale; allergy/clinical content review; iOS and Android installation and airplane-mode checks; accessibility review; per-allergen specificity and dietary requirement detail; localization of the profile editor. Decide the project's license and hosting/sharing policy with the owner before public distribution.

