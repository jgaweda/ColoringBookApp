# Greedy Cookie — Coloring Book for Kids

A toddler-friendly coloring book that ships in two flavors from one repo:

- **PWA** (`web/`) — installs to the iPad home screen via Safari, runs offline forever after first load. Hosted free on GitHub Pages.
- **Native iOS app** (`ColoringBookApp/`, `Resources/`) — SwiftUI + PencilKit, optimized for iPad.

Both share the same category catalog, the same region-mask coloring algorithm, the same KidColors palette, and the same asset pipeline.

## Run free, offline, forever (the PWA path)

This is the simplest path for a kids' iPad with **no recurring cost** to anyone:

1. Push this repo to GitHub. The included workflow at `.github/workflows/pages.yml` deploys the contents of `web/` to GitHub Pages on every push to `main`. GitHub Pages is free for public repos.
2. On the kid's iPad, open the deployed URL in Safari.
3. Tap **Share → Add to Home Screen**. The icon now launches the app full-screen.
4. The service worker (`web/sw.js`) precaches every asset on the first visit. From that point on the app runs **fully offline** — the iPad doesn't need a network to color, save, or browse the gallery.

Saved pages live in IndexedDB on the iPad. Settings live in `localStorage`. Nothing is sent anywhere — no analytics, no ads, no logins, no third-party SDKs.

### Local preview

```bash
./web/serve.sh                # 127.0.0.1:8000
./web/serve.sh --network      # bind 0.0.0.0 so you can hit it from the iPad on the same Wi-Fi
```

Service workers require HTTPS or `localhost`, so the local server above is enough to test the install flow.

### Without any line art shipped

Every page renders a deterministic, seeded procedural composition (5–8 shapes — circles, stars, hearts, flowers, butterflies, etc.) so each page looks unique even before the asset pipeline has produced anything. Replace those by running `tools/generate_lineart.py` (free, see below) at any time.

## Quick start (native iOS)

```bash
brew install xcodegen
xcodegen generate
open ColoringBookApp.xcodeproj
```

Build/run for iPad Pro (12.9") simulator. Requires Xcode 15+ / iOS 17 SDK. The native build is optional — the PWA covers the same feature set.

## Architecture

| Concern            | PWA                                     | iOS                                                |
| ------------------ | --------------------------------------- | -------------------------------------------------- |
| App entry          | `web/js/app.js`                         | `ColoringBookApp/ColoringBookApp.swift`            |
| Home / browse      | `web/js/views/home.js`                  | `ColoringBookApp/Features/Home/`                   |
| Canvas             | `web/js/canvas/canvas-view.js`          | `ColoringBookApp/Features/Canvas/CanvasView.swift` |
| Tap-to-fill core   | `web/js/region-mask.js`                 | `Features/Canvas/RegionMask.swift` + `PaintLayer.swift` |
| Brush              | `web/js/canvas/brush.js` (Pointer Events) | `PKCanvasView` overlay                           |
| Stickers           | `web/js/canvas/stickers.js` (emoji)     | `Features/Canvas/StickerSheet.swift`               |
| Gallery / autosave | `web/js/db.js` (IndexedDB)              | `Persistence/` (SwiftData)                         |
| Audio              | `web/js/audio.js` (Web Audio + SpeechSynthesis) | `Audio/AudioEngine.swift` + `Voiceover.swift` |
| Parental gate      | `web/js/views/parental-gate.js`         | `Features/Settings/ParentalGateView.swift`         |
| Catalog            | `web/data/categories.json`              | `ColoringBookApp/Content/categories.json`          |

### Coloring algorithm

Each page ships with two assets:

- `<page>.png` (or `.svg`) — black-on-white line art.
- `<page>.mask.png` — a region label image where each closed region is a unique RGB.

A tap maps to a normalized (x,y), which the region mask resolves to a label color. The paint layer then recolors every pixel sharing that label in O(N) per region (cached after first hit), giving instant fills even on 4K rasters.

The PWA uses `ImageData` + `Uint32Array` for the paint buffer; iOS uses a CGContext-backed buffer. Same algorithm.

## Generating content (free, no API key)

The PWA and iOS apps are both content-driven: they need ~90 line-art pages plus paired region masks. The pipeline is free by default.

```bash
pip install requests pillow numpy scipy
brew install potrace                # optional, for SVG vectorization

python3 tools/generate_lineart.py            # default backend: Pollinations.ai (free, no key)
python3 tools/build_region_masks.py
```

`generate_lineart.py` writes generated art to **both** `ColoringBookApp/Content/LineArt/<cat>/` (for iOS) and `web/assets/line-art/<cat>/` (for the PWA). `build_region_masks.py` writes paired `*.mask.png` to both locations. Once committed, the apps are fully self-contained.

Backends:

- `--backend pollinations` (default) — free, no API key, no signup. Uses `image.pollinations.ai`.
- `--backend openai` — paid; requires `OPENAI_API_KEY`.

If you don't generate anything, both apps still work — they fall back to a programmatic placeholder so the coloring canvas remains usable for development.

### iOS PWA polish

- App icons live in `web/icon.svg` (committed PNGs at every required size).
- iPad splash images (Pro 12.9", Pro 11", Air, base iPad) are generated by `python3 tools/generate_splash.py` and live in `web/splash/`.
- `web/js/install-hint.js` shows a one-time, dismissible banner explaining how to **Share → Add to Home Screen** on iPad Safari.

## Categories

15 categories, ~6 pages each = 90 pages at launch. Driven by `categories.json` (single source of truth, copied to `web/data/`). All characters are original archetypes — no licensed IP (Spider-Man, Paw Patrol, etc.) — to avoid App Store rejection and DMCA risk.

1. Caped Heroes  2. Princesses & Princes  3. Unicorns  4. Dinosaurs
5. Butterflies & Bugs  6. Dragons & Wizards  7. Space & Rockets
8. Under the Sea  9. Jungle & Safari  10. Farm & Pets
11. Vehicles  12. Robots & Monsters  13. Holidays & Seasons
14. Sweets & Food  15. Letters & Numbers

## Privacy

- **PWA**: nothing leaves the device. All data (gallery, autosave, settings) is local.
- **iOS**: `Resources/PrivacyInfo.xcprivacy` declares no tracking and only the API reasons we actually use.
- **Parental gate** (hold a number for 2 seconds) guards Settings, Share, and Delete on both.

## Tests

PWA: open `web/index.html` and walk the verification checklist (color a page, save, force-quit, reopen, settings).

iOS:

```bash
xcodebuild test -scheme ColoringBookApp \
  -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'
```

Unit tests in `ColoringBookAppTests/` cover region mask lookup, manifest decoding, autosaver round-trip, and undo stack mixing.

## Out of scope (v1)

- iCloud sync, IAP, subscriptions
- Licensed IP packs
- On-device AI generation
- Multi-user profiles
