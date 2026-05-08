# Antichud

AI-powered food-energy tracker. All energy in **kilojoules (kJ)**. Single Expo codebase ships to iOS, Android, and Web. Photos go to **Gemini 3 Flash** via OpenRouter for kJ + macros estimation. All data is local (AsyncStorage / localStorage).

See [plan.md](plan.md) for architecture, [tasks.md](tasks.md) for the lane breakdown, and [design.md](design.md) for the "Energy Table" design system.

## Quick start (simulator / Expo Go)

```sh
npm install --legacy-peer-deps
npm start            # interactive picker; press `i` for iOS sim
npm run web          # web dev server
npm run ios          # native iOS run (uses ios/ workspace if present)
```

## Run on a physical iPhone via Xcode

The native `ios/` project is already generated. To deploy to your phone:

```sh
# (one-time, if ios/ doesn't exist or you change app.json plugins)
npm run prebuild:ios
npm run pods         # cocoapods install with UTF-8 locale workaround

# Day-to-day:
npm run start:lan    # Metro on LAN so the phone can reach it
npm run xcode        # opens ios/Antichud.xcworkspace
```

In Xcode:
1. Select the **Antichud** target → **Signing & Capabilities** → set your Team.
2. Plug in your iPhone, pick it as the run destination (top bar).
3. Hit **▶ Run**. First build takes ~5 min, subsequent builds are fast.
4. The phone will fetch JS from Metro on your Mac (must be on the same Wi-Fi).

## OpenRouter dev proxy (Bun)

A local Bun server forwards OpenRouter calls and prints structured logs of every prompt, image hash + size, latency, token usage, and parsed kJ + macros. Lets you debug the Gemini 3 Flash flow without printf-debugging the client.

```sh
npm run dev:proxy    # starts on http://0.0.0.0:8787
```

Then in `.env.local`, uncomment **one** of:

```
# Simulator:
EXPO_PUBLIC_OPENROUTER_BASE_URL=http://localhost:8787/v1

# Physical iPhone on same Wi-Fi (use your Mac's LAN IP):
EXPO_PUBLIC_OPENROUTER_BASE_URL=http://172.20.10.3:8787/v1
```

Restart `expo start` so the new env var is inlined into the bundle. Every photo upload will now print a colored log block in the Bun terminal showing:

- `→ POST /v1/chat/completions` with model, system prompt head, hint text, image meta + sha
- `← 200 OK` with status, body size, latency, finish reason, token usage
- `estimate` line with name, kJ, confidence
- `macros` line with P / C / F / fiber grams
- `· item` lines for each food component

Set `NO_COLOR=1` to strip ANSI codes if piping to a file. The proxy never logs the API key.

## Environment

Secrets live in `.env.local` (gitignored). Required:

```
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-...
EXPO_PUBLIC_OPENROUTER_MODEL=google/gemini-3-flash-preview
```

Optional:

```
EXPO_PUBLIC_OPENROUTER_BASE_URL=http://localhost:8787/v1   # use the Bun proxy
EXPO_PUBLIC_OPENROUTER_REFERER=https://antichud.local
```

`EXPO_PUBLIC_*` variables are inlined at build time and accessible from any platform.

## Test

```sh
npm test             # one-shot — 83 tests across calc, storage, openrouter, notifications, state
npm run test:watch
npm run typecheck    # tsc --noEmit
npm run lint
```

## Build

```sh
npm run build:web    # static export to dist/
npm run prebuild:ios # regenerate ios/ from app.json (then `npm run pods`)
```

## Ship to TestFlight (EAS Build)

EAS builds the signed `.ipa` on Expo's servers and uploads it to App Store
Connect → TestFlight. No Xcode archives required. Roughly 15 min end-to-end
the first time.

### Prerequisites (one-time)

1. **Apple Developer account** ($99/yr) — [developer.apple.com](https://developer.apple.com)
2. **Expo account** — free at [expo.dev/signup](https://expo.dev/signup)
3. **App-specific password** for your Apple ID — [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords. EAS submit will ask for this.

### Setup (one-time per machine / project)

```sh
# Log in to Expo
eas login

# Link this project to an EAS project (writes extra.eas.projectId into app.json)
npm run eas:init

# Push the API key as an EAS secret (NEVER commit this)
eas secret:create --scope project --name EXPO_PUBLIC_OPENROUTER_API_KEY --type string --value "sk-or-..."
```

### Build & submit

```sh
# 1. Build the production .ipa on EAS servers
npm run build:ios:prod

# Wait ~10 min. EAS will:
#   - generate signing certs + provisioning profile (say "yes" when prompted)
#   - bump ios.buildNumber automatically (autoIncrement: true in eas.json)
#   - bundle EXPO_PUBLIC_OPENROUTER_API_KEY from your EAS secret
#   - upload to expo.dev with a download link

# 2. Submit the latest build to App Store Connect → TestFlight
npm run submit:ios

# First time only: EAS will create the App Store Connect listing for you.
# It needs your Apple ID + the app-specific password from step 3 above.
```

### After submission

1. Go to **App Store Connect → My Apps → Antichud → TestFlight**.
2. Wait ~10 min for Apple to process the build (you'll get an email).
3. Add yourself as an **internal tester** under the Internal Testing group — instant, no Apple review.
4. On your iPhone, install the **TestFlight** app from the App Store, sign in with the same Apple ID, accept the invite, hit Install.

### Subsequent builds

```sh
# Bump the marketing version in app.json (e.g. "0.1.0" → "0.2.0") if it's a
# user-visible change. Build numbers auto-increment on EAS.
npm run build:ios:prod
npm run submit:ios
```

### Notes

- The local Bun dev proxy is **not used in TestFlight builds**. The app calls OpenRouter directly using `EXPO_PUBLIC_OPENROUTER_API_KEY` baked at build time.
- `EXPO_PUBLIC_*` env vars are bundled into the JS — anyone who downloads your `.ipa` can extract the key. For a personal TestFlight this is fine; for a public release, route calls through a hosted proxy you control.
- The local `AppDelegate.mm` Metro IP patch (under `ios/`) is only relevant for dev-on-device. EAS regenerates `ios/` fresh from `app.json` for production builds, so the patch is automatically excluded.
- `runtimeVersion.policy: "appVersion"` in `app.json` means OTA updates can only ship to builds with the same `version` string. Bump `version` when changing native modules; leave it alone for JS-only changes.

## Layout

- `app/` — expo-router file-based routes (`(tabs)` group is the main shell)
- `components/` — reusable UI primitives + `KJReadout`, `Ring`, `MeasurementTape`, `MacrosBar`, `KJTrendChart`, `WeightTrendChart`
- `lib/calc/` — BMI, BMR, TDEE, kJ math (pure, fully tested)
- `lib/storage/` — typed AsyncStorage wrappers
- `lib/openrouter/` — Gemini 3 Flash client (vision + macros)
- `lib/notifications/` — local push reminders with smart-body composer
- `lib/state/` — zustand stores
- `styles/` — design tokens (Energy Table palette + DM Serif / Work Sans / JetBrains Mono)
- `server/dev-proxy.ts` — Bun OpenRouter proxy
- `__tests__/` — unit tests
- `ios/` — native Xcode project (regenerated by `expo prebuild`)
