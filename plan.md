# Antichud — Build Plan

## Goal

Antichud is an AI-powered food-energy tracker. Distinctive: **all energy is reported in kilojoules (kJ)**, not calories — that is the brand. Built as a single Expo (React Native + Web) app, fully offline-first with everything in AsyncStorage / localStorage. Photos of food are sent to Gemini 2.5 Flash via OpenRouter for an energy estimate.

## Hard requirements (from user)

1. **Expo app, full stack** — one repo, runs on iOS/Android/Web from one codebase.
2. **kilojoules everywhere** — never display kcal as the primary unit. Optional kcal helper (×0.239) shown small/secondary.
3. **Full feature set**:
   - Profile: target weight, current weight, height, age, sex, activity level → BMI + BMR + TDEE in kJ
   - Energy goal: deficit/maintenance/surplus, computed in kJ/day
   - Daily log: foods logged with photo + AI estimate (kJ)
   - Weight log: timestamped weight entries, trend chart
   - Notifications: local push reminders to log a meal after a configurable interval
4. **Photo → AI estimate flow**: take/pick a photo → send base64 to OpenRouter (Gemini 2.5 Flash) → parse a structured JSON answer → confirm/edit → save.
5. **OpenRouter key** is in `.env.local` already (see `EXPO_PUBLIC_OPENROUTER_API_KEY`).
6. **localStorage / AsyncStorage** for ALL persistence. No backend, no Supabase.
7. **Frontend-design skill is the ONLY design guide** — see `.skills/frontend-design/SKILL.md`. Bold, distinctive, NOT generic AI aesthetic.
8. **Unit tests written**, **CI configured**, **typecheck + build must pass**.
9. **One-shot**: at end of run, `npm install && npm run typecheck && npm test && npx expo export` should all succeed.

## Architecture (filled in by architect)

### Stack
- **Runtime**: Expo SDK 52 (React Native 0.76, React 18.3) — single codebase, three platforms (iOS/Android/Web).
- **Language**: TypeScript, strict mode, `noUncheckedIndexedAccess` on. Path alias `@/*` → repo root.
- **Navigation**: `expo-router` v4 (file-based, typed routes). Root group is `app/(tabs)/` for the main shell; onboarding is a stack route at `app/onboarding.tsx` (planner to confirm).
- **State**: `zustand` for in-memory app state (profile, today's log, settings). Persistence is hand-rolled with AsyncStorage so we control schema/migrations.
- **Persistence**: `@react-native-async-storage/async-storage` everywhere (it transparently maps to `localStorage` on web). All keys live behind typed wrappers in `lib/storage/`. No backend, no Supabase, no remote DB.
- **AI provider**: OpenRouter → `google/gemini-2.5-flash`. Vision call sends a base64 data URL as an `image_url` content part alongside the text prompt; response is parsed as structured JSON. Key read from `process.env.EXPO_PUBLIC_OPENROUTER_API_KEY` (build-time inlined).
- **Charts**: `react-native-svg-charts` for the weight-trend line chart. Chosen over `victory-native` because it works on web out of the box with `react-native-svg` and has a much smaller surface for our single line+area chart.
- **Notifications**: `expo-notifications` on native, `window.Notification` (with permission flow) on web — wrapped behind `lib/notifications/`.
- **Animations**: `react-native-reanimated` v3 (Babel plugin loaded last as required).
- **Testing**: `jest` + `jest-expo` preset + `@testing-library/react-native`. CI runs typecheck, tests, and `expo export --platform web`.

### Directory layout
```
app/                    expo-router routes (file-based)
  (tabs)/               main tab shell — home, log, weight, profile (planner to flesh out)
components/             reusable UI primitives + feature components
lib/
  calc/                 pure functions: BMI, BMR (Mifflin-St Jeor), TDEE, kJ math
  storage/              typed AsyncStorage wrappers + schema versioning
  openrouter/           Gemini 2.5 Flash client (vision) + JSON-schema parsing
  notifications/        cross-platform reminders (expo-notifications + web Notification)
styles/                 design tokens (color, type scale, spacing) — designer fills
assets/                 icons, splash, fonts
  fonts/                custom display + body faces (designer picks)
types/                  shared TS types (Profile, FoodEntry, WeightEntry, etc.)
__tests__/              unit tests, mirrors lib/ structure
.github/workflows/      CI (typecheck + test + web export)
```

### Data model (sketch — planner to refine)
- `Profile`: weight_kg, target_weight_kg, height_cm, age, sex, activity_level, kj_goal, deficit_mode.
- `FoodEntry`: id, timestamp, name, kj, photo_uri (local file or data URL), ai_meta (model, raw response).
- `WeightEntry`: id, timestamp, weight_kg.
- `Settings`: reminder_interval_min, last_reminder_at, units (kJ primary, kcal helper toggle).

### One-shot success criteria
After `npm install`, the following must pass without further intervention:
`npm run typecheck && npm test && npx expo export --platform web`.

### Open notes for downstream agents
- Designer: design tokens go in `styles/`. Pick a distinctive display + body font pair per the frontend-design skill — this is the brand. Avoid Inter/Roboto/Space Grotesk.
- Planner: convert features into TaskCreate entries; respect onboarding-before-home gating.
- Implementers: never display kcal as primary; always kJ. Use `lib/calc/` for all energy math; do not inline conversions in components.

## Design system (filled in by designer)

See `design.md` for the full spec. Concept: **"Energy Table"** — editorial / scientific aesthetic, 1960s physics-journal energy table reborn as a phone app. Cream paper + deep ink + one molten-orange accent (`#E8472C` light / `#FF6B47` dark). Fonts: **DM Serif Display** (display), **Work Sans** (body), **JetBrains Mono** (kJ readouts, tabular figures). Hairline 0.5px rules everywhere, sharp 0–4px corners, no shadows. Signature element: horizontal **measurement-tape** progress component with tick marks every 500 kJ used on Home / Weight / Profile screens. All tokens live in `styles/tokens.ts`; consume via `useTheme()` from `styles/theme.ts` and presets from `styles/typography.ts`. Fonts loaded via `useLoadFonts()` in `styles/fonts.ts`.

## Feature breakdown (filled in by planner)

_To be written by planner-1 — converted into TaskCreate entries._

## Acceptance criteria

- [ ] `npm install` from a clean clone succeeds
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm test` passes all unit tests with ≥1 test per non-trivial module
- [ ] `npx expo export --platform web` succeeds
- [ ] Web preview renders the home screen (`/`) with the daily kJ ring and a "Log food" CTA
- [ ] Onboarding flow saves profile (weight, height, age, sex, activity, target weight) to AsyncStorage
- [ ] BMI, BMR (Mifflin-St Jeor in kJ), TDEE, and daily kJ goal all derive correctly from profile
- [ ] Photo logging flow: pick image → call OpenRouter → display kJ estimate → save to log
- [ ] Notifications can be scheduled (web: Notification API; native: expo-notifications) with a configurable cadence
- [ ] CI workflow runs typecheck + tests on push to main
- [ ] No file references kcal as the primary display unit

## kJ conversion reference (so all agents agree)

- 1 kcal = 4.184 kJ
- BMR (Mifflin-St Jeor) → kcal/day → multiply by 4.184 to get kJ/day
- Activity multipliers (sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9)
- Default deficit: 2000 kJ/day below TDEE for weight loss; default surplus: +1500 kJ/day for gain
- BMI = weight_kg / (height_m ^ 2)

## Status log

- 2026-05-07: Project bootstrapped, skill copied to `.skills/frontend-design/`, `.env.local` written.
- [x] Architecture bootstrapped (architect-1, 2026-05-07) — package.json, app.json, tsconfig, babel, metro, jest, eslint, CI workflow, README, and full directory skeleton written. Designer + planner unblocked.
- [x] Tasks broken down into 8 lanes (planner-1, 2026-05-07) — see tasks.md
- [x] Design system v1 (designer-1, 2026-05-07) — concept "Energy Table", fonts DM Serif Display/Work Sans (mono: JetBrains Mono), accent #E8472C
- [x] Screens implemented (impl-screens, 2026-05-07)
- [x] typecheck green (audit-fix, 2026-05-07)
- [x] tests green: 5 suites / 81 assertions (audit-fix, 2026-05-07)
- [x] build:web green: dist 7.4M, 1 web bundle, 11 static routes (audit-fix, 2026-05-07)
