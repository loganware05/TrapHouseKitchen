## Status

**WIP / scaffold.** Capacitor config, CORS, and API URL handling are in the web app. Native `frontend/ios/` is generated on your machine (often gitignored) — this is **not** App Store ready.

# iOS Setup Guide — TrapHouse Kitchen

This guide covers building, syncing, and running the TrapHouse Kitchen React/Vite frontend as a native iOS app using [Capacitor](https://capacitorjs.com/). The backend stays hosted on Render (or another cloud provider); the iOS app calls it over HTTPS via `VITE_API_URL`.

## Architecture

```
React/Vite frontend (frontend/dist)
        ↓
Capacitor iOS wrapper (frontend/ios/)
        ↓
Xcode project → iPhone Simulator / TestFlight / App Store
        ↓
Hosted Express API + PostgreSQL (Render)
```

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **macOS** | Required for Xcode |
| **Xcode** | Latest stable from the Mac App Store |
| **Node.js 20+** | Same as the web project |
| **Apple ID** | Free account works for Simulator |
| **Apple Developer Program** | $99/year — required for TestFlight and App Store |

Capacitor 8 for this project uses Swift Package Manager for plugins (no CocoaPods install required for basic setup).

## One-time project setup

Capacitor is already configured in this repo:

- [`frontend/capacitor.config.ts`](frontend/capacitor.config.ts) — app ID `com.traphousekitchen.app`, web dir `dist`
- [`frontend/ios/`](frontend/ios/) — native Xcode project (committed)
- npm scripts: `ios:build`, `ios:sync`, `ios:open`, `ios:run`

If you clone fresh, install frontend dependencies first:

```bash
cd frontend
npm install
```

## Environment configuration

Vite embeds `VITE_*` variables at **build time**. Native builds must point at your deployed API — not `localhost`.

1. Copy the production template:

```bash
cd frontend
cp .env.production.example .env.production
```

2. Edit `.env.production` (this file is gitignored):

```bash
VITE_API_URL=https://traphousekitchen-api.onrender.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

Replace the API URL and Stripe key with your real deployed values. The API URL must include `/api`.

3. Ensure the backend allows Capacitor origins. After deploying the API with the CORS update in this repo, production accepts `capacitor://localhost` by default. Optional env on the API service:

```bash
CAPACITOR_ORIGINS=capacitor://localhost,ionic://localhost
```

Redeploy the API after merging CORS changes. See [`docs/deployment/DEPLOYMENT_ENV_VARS.md`](docs/deployment/DEPLOYMENT_ENV_VARS.md).

## Build, sync, and open in Xcode

From the `frontend/` directory:

```bash
# Build web assets + copy to ios/ (recommended)
npm run ios:build

# Or step by step:
npm run build
npx cap sync ios

# Open Xcode
npm run ios:open
```

From the repo root:

```bash
npm run ios:open
```

**Important:** Run `npm run ios:build` (or at least `npm run build && npx cap sync ios`) after every frontend code change before testing in Xcode.

## Xcode signing

1. Open the project: `npm run ios:open` (opens `frontend/ios/App/App.xcworkspace` or `App.xcodeproj`).
2. Select the **App** target in the project navigator.
3. Open **Signing & Capabilities**.
4. Set **Team** to your Apple Developer team (or personal team for Simulator-only).
5. Confirm **Bundle Identifier** is `com.traphousekitchen.app`.
6. Enable **Automatically manage signing**.

For Simulator testing, a free Apple ID is sufficient. For a physical device, TestFlight, or App Store, you need a paid Apple Developer account.

## Run on iPhone Simulator

1. In Xcode, choose a simulator (e.g. iPhone 16).
2. Press **Run** (⌘R).
3. Wait for the app to launch.

### Simulator smoke-test checklist

- [ ] App launches without a blank screen
- [ ] Menu loads (API connectivity)
- [ ] Customer login / registration
- [ ] Guest checkout
- [ ] Cart and checkout sheet
- [ ] Order creation and order history
- [ ] Allergen profile and warnings
- [ ] Dish requests
- [ ] Reviews (view and submit)
- [ ] Chef login and dashboard (`/chef/login`)

If menu or login fails, see [Troubleshooting](#troubleshooting).

## Run on a physical iPhone

1. Connect the device via USB (or use wireless debugging).
2. Select your device in Xcode’s run destination menu.
3. Trust the developer certificate on the device (**Settings → General → VPN & Device Management**).
4. Run (⌘R).

Use a physical device for Stripe payment testing before any production release.

## Stripe on iOS

Checkout uses Stripe Elements in a WebView ([`CheckoutSheet.tsx`](frontend/src/components/CheckoutSheet.tsx)).

| Scenario | Guidance |
|----------|----------|
| **Simulator** | Test card `4242 4242 4242 4242` with your Stripe test publishable key |
| **Real device** | Required before release — test full payment, 3DS redirects, and order confirmation |
| **Apple Pay in native app** | May not behave like Safari PWA (domain association is web-origin based). Treat as a follow-up; card entry is the v1 path |

Ensure `VITE_STRIPE_PUBLISHABLE_KEY` in `.env.production` matches the mode (test vs live) of your backend Stripe secret key.

## App icons and splash screen

PWA icon PNGs may need to be added under `frontend/public/`. For App Store submission:

1. Add brand icons (192×192, 512×512, 180×180 minimum).
2. In Xcode: **App → Assets.xcassets → AppIcon** — drag in required sizes (1024×1024 for App Store).
3. Splash screen: Capacitor uses the native iOS launch storyboard; theme color `#f97316` matches the web app.

Optional: use `@capacitor/assets` with a 1024×1024 master icon to generate all sizes.

## TestFlight and App Store (outline)

1. Complete icon and splash assets.
2. In Xcode: **Product → Archive**.
3. **Distribute App → App Store Connect**.
4. In [App Store Connect](https://appstoreconnect.apple.com): create the app record, upload metadata, submit for review.
5. Use **TestFlight** for beta testers before public release.

## npm scripts reference

| Script | Description |
|--------|-------------|
| `npm run ios:build` | `npm run build` then `npx cap sync ios` |
| `npm run ios:sync` | Copy latest `dist/` into `ios/` without rebuilding |
| `npm run ios:open` | Open the Xcode project |
| `npm run ios:run` | Build, sync, and run on a connected device/simulator via CLI |

## Troubleshooting

### API calls fail / network errors

- Confirm `.env.production` exists with a real `VITE_API_URL` **before** `npm run build`.
- Rebuild: `npm run ios:build`.
- Verify the API is up: `https://traphousekitchen-api.onrender.com/health` (or your URL).

### CORS errors in Xcode console

- Redeploy the backend with Capacitor origin support (`capacitor://localhost`).
- Ensure `FRONTEND_URL` on the API still matches your web deploy (unchanged for PWA/web).
- Optional: set `CAPACITOR_ORIGINS` on the API service.

### Blank white screen

- Run `npm run ios:build` after frontend changes.
- Check Xcode console for JavaScript errors.
- Confirm `dist/index.html` exists and `webDir: 'dist'` in `capacitor.config.ts`.

### `VITE_API_URL must be set for native iOS builds`

- Create `frontend/.env.production` from `.env.production.example`.
- Rebuild with `npm run ios:build`.

### Stale UI after code changes

- Always run `npm run ios:build` before re-running in Xcode.
- If a service worker caches old assets in the WebView, clear the app from the simulator and reinstall.

### Xcode build failures

- Clean build folder: **Product → Clean Build Folder** (⇧⌘K).
- Delete the app from the simulator and run again.
- Ensure Xcode command-line tools are installed: `xcode-select --install`.

### Safe area / notch overlap

- Layout uses `safe-top` / `safe-bottom` on header and tab bar.
- Horizontal safe areas are applied on `body` in `index.css`.
- If the toast overlaps the notch, adjust Sonner offset in `main.tsx`.

## Web and PWA unchanged

- **Web deploy:** Render static site build is unchanged (`npm run build` in `frontend/`).
- **PWA:** `vite-plugin-pwa` remains enabled for browser installs.
- **Local dev:** `npm run dev` still uses `http://localhost:3001/api` via `.env` or Vite proxy.

## Related docs

- [`docs/deployment/render.md`](docs/deployment/render.md) — Render deployment
- [`docs/deployment/DEPLOYMENT_ENV_VARS.md`](docs/deployment/DEPLOYMENT_ENV_VARS.md) — env vars including `CAPACITOR_ORIGINS`
- [`frontend/.env.production.example`](frontend/.env.production.example) — iOS/production build template
