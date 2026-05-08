# Antichud — Task Breakdown

Eight parallelizable lanes. **File ownership is exclusive**: only the owning agent may write to its `Writes` paths. Other lanes may `Read` those paths once they exist. No two lanes write the same file.

Lane execution order (for dependency reasons — lanes within a tier can run in parallel):

- **Tier A** (no deps): Lane 1 (types), Lane 6 (ui-primitives), Lane 5 (notifications)
- **Tier B** (depends on Lane 1): Lane 2 (math), Lane 3 (storage), Lane 4 (openrouter)
- **Tier C** (depends on A+B): Lane 8 (state-and-tests)
- **Tier D** (depends on everything): Lane 7 (screens)

Cross-cutting acceptance (all lanes):
- All energy values displayed primarily in **kJ**. `kcal` may appear ONLY as small helper text via `kjToKcal()`.
- BMI = `weight_kg / (height_m^2)`.
- TDEE = BMR (Mifflin-St Jeor in kJ) × activity_multiplier.
- Daily goal = TDEE − deficit (default 2000 kJ for cut, +1500 kJ for bulk, 0 for maintain).
- All persistence under `antichud:v1:*` keys.
- Photo flow: pick/take photo → display → submit → AI estimate → confirm/edit → save.
- Notifications scheduled at N-minute intervals; web uses `window.Notification`, native uses `expo-notifications`.
- Every `lib/` module has at least one unit test.
- TypeScript strict mode; no `any` in public APIs.

---

## Lane 1: types  (owner: impl-types)

**Reads (allowed):** `plan.md`, `package.json`, `tsconfig.json`
**Writes (owns):**
- `types/index.ts`

### Tasks
- [ ] T1.1 — Define `Sex` (`'male' | 'female'`).
- [ ] T1.2 — Define `ActivityLevel` (`'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'`).
- [ ] T1.3 — Define `DeficitMode` (`'cut' | 'maintain' | 'bulk'`).
- [ ] T1.4 — Define `Profile` (weight_kg, target_weight_kg, height_cm, age, sex, activity_level, deficit_mode, kj_goal_override?, created_at, updated_at).
- [ ] T1.5 — Define `FoodEntry` (id, timestamp, name, kj, photo_uri?, confidence?, items?, ai_meta?).
- [ ] T1.6 — Define `FoodEntryItem` (name, kj, qty?).
- [ ] T1.7 — Define `WeightEntry` (id, timestamp, weight_kg).
- [ ] T1.8 — Define `Settings` (reminder_interval_min, reminders_enabled, last_reminder_at?, show_kcal_helper).
- [ ] T1.9 — Define `BMICategory` (`'underweight' | 'normal' | 'overweight' | 'obese'`).
- [ ] T1.10 — Define `EnergyEstimate` (name, kj, confidence: `'low'|'med'|'high'`, items: `FoodEntryItem[]`).
- [ ] T1.11 — Re-export every type from a single `types/index.ts` barrel.
- [ ] T1.12 — Mark fields `Readonly` where mutation is not intended; mark optional fields with `?`.

### Acceptance
- File compiles standalone under `tsc --noEmit`.
- No runtime code; types-only file.
- All other lanes import shared types from `@/types`.

---

## Lane 2: math  (owner: impl-math)

**Reads (allowed):** `types/index.ts`
**Writes (owns):**
- `lib/calc/energy.ts`
- `lib/calc/bmi.ts`
- `lib/calc/index.ts`
- `__tests__/calc.test.ts`

### Tasks
- [ ] T2.1 — Constants in `energy.ts`: `KCAL_TO_KJ = 4.184`, `ACTIVITY_MULTIPLIERS` map for all `ActivityLevel`s, `DEFAULT_CUT_DEFICIT_KJ = 2000`, `DEFAULT_BULK_SURPLUS_KJ = 1500`.
- [ ] T2.2 — `kcalToKJ(kcal: number): number` — multiply, round to nearest int.
- [ ] T2.3 — `kjToKcal(kj: number): number` — divide, round to nearest int.
- [ ] T2.4 — `bmrKJ({ sex, weight_kg, height_cm, age }): number` — Mifflin-St Jeor in kcal then convert via `kcalToKJ`. Female: `10w + 6.25h − 5a − 161`; male: `10w + 6.25h − 5a + 5`.
- [ ] T2.5 — `tdeeKJ({ bmr_kj, activity_level }): number` — `bmr_kj * ACTIVITY_MULTIPLIERS[level]`, rounded.
- [ ] T2.6 — `dailyGoalKJ({ tdee_kj, deficit_mode, override_kj? }): number` — applies cut/bulk/maintain offset; `override_kj` wins when present.
- [ ] T2.7 — `remainingKJ({ goal_kj, consumed_kj }): number` — `goal_kj − consumed_kj` (may be negative).
- [ ] T2.8 — In `bmi.ts`: `bmi({ weight_kg, height_cm }): number` and `bmiCategory(bmi: number): BMICategory` (<18.5 / <25 / <30 / ≥30).
- [ ] T2.9 — `lib/calc/index.ts` re-exports everything from the two modules.
- [ ] T2.10 — Tests in `__tests__/calc.test.ts`:
  - `kcalToKJ(100) === 418` (rounded).
  - `kjToKcal(2000) === 478` (rounded).
  - BMR for known male/female cases (snapshot exact integers).
  - TDEE multiplies BMR by correct multiplier per level.
  - `dailyGoalKJ` honors override and applies correct deficit/surplus.
  - BMI computation + category boundaries (18.5, 25, 30).

### Acceptance
- All functions are pure (no side effects, no I/O).
- All energy outputs are kJ (integers), never kcal.
- `npm test` passes for `__tests__/calc.test.ts`.
- 100% of exports are covered by at least one test.

---

## Lane 3: storage  (owner: impl-storage)

**Reads (allowed):** `types/index.ts`
**Writes (owns):**
- `lib/storage/keys.ts`
- `lib/storage/profile.ts`
- `lib/storage/foodLog.ts`
- `lib/storage/weightLog.ts`
- `lib/storage/settings.ts`
- `lib/storage/index.ts`
- `__tests__/storage.test.ts`

### Tasks
- [ ] T3.1 — `keys.ts`: export `KEY_PREFIX = 'antichud:v1:'` and named constants `K_PROFILE`, `K_FOOD_LOG`, `K_WEIGHT_LOG`, `K_SETTINGS`, `K_SCHEMA_VERSION`. Export `SCHEMA_VERSION = 1`.
- [ ] T3.2 — `profile.ts`: `getProfile(): Promise<Profile | null>`, `setProfile(p: Profile): Promise<void>`, `clearProfile(): Promise<void>`. JSON-encode; catch parse errors → return null.
- [ ] T3.3 — `foodLog.ts`: `getFoodLog(): Promise<FoodEntry[]>`, `appendFood(e: FoodEntry): Promise<void>`, `removeFood(id: string): Promise<void>`, `replaceFood(e: FoodEntry): Promise<void>`, `getFoodForDate(date: Date): Promise<FoodEntry[]>` (filters by local-day boundary).
- [ ] T3.4 — `weightLog.ts`: `getWeightLog(): Promise<WeightEntry[]>`, `appendWeight(e: WeightEntry): Promise<void>`, `removeWeight(id: string): Promise<void>`. Sorted ascending by timestamp on read.
- [ ] T3.5 — `settings.ts`: `getSettings(): Promise<Settings>` (returns sane defaults — `reminder_interval_min: 240, reminders_enabled: false, show_kcal_helper: true`), `setSettings(s: Settings): Promise<void>`, `patchSettings(p: Partial<Settings>): Promise<Settings>`.
- [ ] T3.6 — `index.ts`: re-export everything from the four modules + `keys.ts`.
- [ ] T3.7 — Schema-version check on first read of any module: if stored version < `SCHEMA_VERSION`, run a no-op migration and write the new version. Write `SCHEMA_VERSION` once on first successful set.
- [ ] T3.8 — Tests in `__tests__/storage.test.ts` with mocked AsyncStorage:
  - mock `@react-native-async-storage/async-storage` via `jest.mock`.
  - profile round-trip (set → get → equality).
  - foodLog append + remove + replace; date-filter test crossing midnight.
  - weightLog append + sorted read.
  - settings defaults on empty store; `patchSettings` merges correctly.

### Acceptance
- Every key actually used is `KEY_PREFIX + suffix`. No string literals containing the prefix outside `keys.ts`.
- All functions return Promises and are async-safe.
- No direct `AsyncStorage` calls outside this lane (enforced socially via code review).
- `npm test` passes for `__tests__/storage.test.ts`.

---

## Lane 4: openrouter  (owner: impl-ai)

**Reads (allowed):** `types/index.ts`
**Writes (owns):**
- `lib/openrouter/types.ts`
- `lib/openrouter/client.ts`
- `lib/openrouter/estimate.ts`
- `lib/openrouter/index.ts`
- `__tests__/openrouter.test.ts`

### Tasks
- [ ] T4.1 — `types.ts`: `EstimateInput` (`{ imageBase64: string; mimeType?: string; hint?: string }`), `EstimateResult` (matches `EnergyEstimate` from Lane 1), `OpenRouterMessage`, `OpenRouterChatRequest`, `OpenRouterChatResponse`, `OpenRouterError`.
- [ ] T4.2 — `client.ts`: `chatCompletion(req: OpenRouterChatRequest, opts?: { signal?: AbortSignal }): Promise<OpenRouterChatResponse>`. POST `https://openrouter.ai/api/v1/chat/completions`. Reads `EXPO_PUBLIC_OPENROUTER_API_KEY` (throw clear error if missing). Sets `Authorization: Bearer …`, `HTTP-Referer: 'https://antichud.app'`, `X-Title: 'Antichud'`, `Content-Type: application/json`. Throws `OpenRouterError` (with status + body) on non-2xx.
- [ ] T4.3 — `estimate.ts`: `estimateFoodKJ(input: EstimateInput): Promise<EstimateResult>`. Composes a system prompt that:
  - Instructs the model to respond ONLY as JSON matching schema `{ name, kj, confidence, items: [{ name, kj, qty? }] }`.
  - Reminds it that `kj` is **kilojoules**, not calories.
  - Allows optional `hint` text from the user.
  Sends a user message with `content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:<mime>;base64,<b64>' } }]`.
  Uses model from `process.env.EXPO_PUBLIC_OPENROUTER_MODEL` (default `'google/gemini-2.5-flash'`).
  Includes `response_format: { type: 'json_object' }`.
  Parses `choices[0].message.content` as JSON; clamps/validates fields; rejects with helpful error if JSON malformed.
- [ ] T4.4 — `index.ts`: re-export `client.ts`, `estimate.ts`, `types.ts`.
- [ ] T4.5 — Tests in `__tests__/openrouter.test.ts`:
  - mock global `fetch`.
  - missing API key throws.
  - successful 200 with valid JSON content → returns parsed `EstimateResult`.
  - 200 with malformed JSON content → throws structured parse error.
  - non-2xx response → throws `OpenRouterError` with status preserved.
  - request body includes `image_url` data URL with the supplied base64.
  - `response_format: { type: 'json_object' }` is present in the request.

### Acceptance
- Never logs or returns the API key.
- Image is sent as a data URL (`data:image/jpeg;base64,…`) inside an `image_url` content part.
- All energy in returned object is interpreted as kJ.
- Confidence is one of `'low' | 'med' | 'high'`; coerced from synonyms (`'medium'` → `'med'`).
- `npm test` passes for `__tests__/openrouter.test.ts`.

---

## Lane 5: notifications  (owner: impl-notify)

**Reads (allowed):** `types/index.ts`
**Writes (owns):**
- `lib/notifications/index.ts`
- `lib/notifications/native.ts`
- `lib/notifications/web.ts`
- `lib/notifications/scheduler.ts`

### Tasks
- [ ] T5.1 — `index.ts`: chooses between `native.ts` and `web.ts` via `Platform.OS === 'web'`. Re-exports the shared API: `requestPermission(): Promise<boolean>`, `scheduleReminder(intervalMin: number): Promise<string | null>`, `cancelAllReminders(): Promise<void>`, `isPermissionGranted(): Promise<boolean>`.
- [ ] T5.2 — `native.ts`: uses `expo-notifications`. `setNotificationHandler` sets `shouldShowAlert: true`, `shouldPlaySound: false`, `shouldSetBadge: false`. `scheduleReminder` schedules a repeating local notification with `seconds: intervalMin * 60, repeats: true` and a friendly "Time to log a meal" title + "Antichud is watching your kJ" body. `cancelAllReminders` calls `Notifications.cancelAllScheduledNotificationsAsync`.
- [ ] T5.3 — `web.ts`: uses `window.Notification`. `requestPermission` calls `Notification.requestPermission()`. `scheduleReminder` uses `setInterval` to fire `new Notification(title, { body })`; tracks the interval id in a module-level map for `cancelAllReminders`. `isPermissionGranted` returns `Notification.permission === 'granted'`. Guard all `window.Notification` access with `typeof window !== 'undefined' && 'Notification' in window`.
- [ ] T5.4 — `scheduler.ts`: small helper `nextFireDelayMs(lastFiredAt: number | null, intervalMin: number, now: number = Date.now()): number` — returns ms until the next fire, never negative. Pure function.
- [ ] T5.5 — Both platforms expose identical signatures so callers don't branch.

### Acceptance
- No imports of `expo-notifications` from `web.ts`.
- No imports of `window` from `native.ts`.
- All public functions are no-ops (rather than throws) when permission is denied; they return `false` / `null` / resolve.
- Web fallback works in SSR (no crash if `window` undefined at import time).

---

## Lane 6: ui-primitives  (owner: impl-ui)

**Reads (allowed):** `styles/tokens.ts`, `styles/typography.ts`, `types/index.ts` (read-only — owned by designer / Lane 1)
**Writes (owns):**
- `components/Screen.tsx`
- `components/Text.tsx`
- `components/Button.tsx`
- `components/Card.tsx`
- `components/Pressable.tsx`
- `components/KJReadout.tsx`
- `components/Ring.tsx`
- `components/Hairline.tsx`
- `components/Tag.tsx`
- `components/index.ts`

### Tasks
- [ ] T6.1 — `Screen.tsx`: top-level scrollable safe-area wrapper. Props: `children`, `scroll?: boolean`, `padded?: boolean`. Pulls background color from tokens.
- [ ] T6.2 — `Text.tsx`: typography primitive. Props: `variant: 'display' | 'title' | 'body' | 'mono' | 'caption' | 'micro'`, `tone?: 'primary' | 'muted' | 'accent' | 'inverse'`, `align?`, `numberOfLines?`. Uses `styles/typography.ts`.
- [ ] T6.3 — `Pressable.tsx`: themed wrapper around `react-native`'s `Pressable` with hover/pressed feedback aligned to tokens (opacity dip + optional haptic via `expo-haptics`).
- [ ] T6.4 — `Button.tsx`: built on `Pressable`. Props: `label`, `onPress`, `variant: 'primary' | 'secondary' | 'ghost' | 'destructive'`, `size: 'sm' | 'md' | 'lg'`, `loading?`, `disabled?`, `iconLeft?`, `iconRight?`. Uses tokens for color/spacing.
- [ ] T6.5 — `Card.tsx`: container with token-driven padding, radius, border, optional `title` and `footer` slots.
- [ ] T6.6 — `KJReadout.tsx`: signature digit-readout. Props: `kj: number`, `goalKJ?: number`, `unitLabel?: string` (defaults to `'kJ'`), `kcalHelper?: boolean`. Renders the kJ number BIG using the display font, the unit small to its right, optional `kcal` helper underneath via `kjToKcal()` (imported from `@/lib/calc`). Tabular numerals.
- [ ] T6.7 — `Ring.tsx`: animated kJ ring. Props: `value: number`, `max: number`, `size?: number`, `strokeWidth?: number`, `label?: string`, `children?: React.ReactNode`. Built with `react-native-svg`. Animates fill via `react-native-reanimated`. Renders `children` (typically a `<KJReadout>`) inside the ring.
- [ ] T6.8 — `Hairline.tsx`: signature 1px (or sub-px) horizontal/vertical rule with token-driven color and optional inset.
- [ ] T6.9 — `Tag.tsx`: small pill/chip. Props: `label`, `tone: 'neutral' | 'warn' | 'good' | 'bad'`, `size: 'sm' | 'md'`.
- [ ] T6.10 — `components/index.ts`: barrel re-export of all primitives.
- [ ] T6.11 — NO inline color or font-size literals; everything reads from `styles/tokens.ts` / `styles/typography.ts`. NO hard-coded `#hex` or `Inter`/`Roboto`/`Space Grotesk`.

### Acceptance
- Every primitive renders on web AND native (no platform-only APIs without a guard).
- `KJReadout` formats numbers with thousands separators and tabular figures.
- `Ring` animates from 0 → value on mount and updates smoothly when `value` changes.
- Every primitive accepts a `style?` and a `testID?` prop.

---

## Lane 7: screens  (owner: impl-screens)

**Reads (allowed):** `components/*` (Lane 6), `lib/calc/*` (Lane 2), `lib/storage/*` (Lane 3), `lib/openrouter/*` (Lane 4), `lib/notifications/*` (Lane 5), `lib/state/*` (Lane 8), `types/*` (Lane 1), `styles/*`
**Writes (owns):**
- `app/_layout.tsx`
- `app/index.tsx`
- `app/onboarding.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/log.tsx`
- `app/(tabs)/weight.tsx`
- `app/(tabs)/profile.tsx`

### Tasks
- [ ] T7.1 — `app/_layout.tsx`: root expo-router stack. Loads custom fonts via `expo-font` (uses the `@expo-google-fonts/dm-serif-display`, `@expo-google-fonts/work-sans`, `@expo-google-fonts/jetbrains-mono` already in `package.json`). Hides splash once fonts loaded. Hydrates Zustand stores on boot.
- [ ] T7.2 — `app/index.tsx`: gate route. On mount, reads profile via `lib/state/profile`. Redirects to `/onboarding` if profile is null, else to `/(tabs)`.
- [ ] T7.3 — `app/onboarding.tsx`: multi-step form (single screen, vertical sections is fine). Collects: current weight, target weight, height, age, sex, activity level. Computes BMI/BMR/TDEE preview using `lib/calc`. On submit: writes profile via `lib/state/profile`, navigates to `/(tabs)`.
- [ ] T7.4 — `app/(tabs)/_layout.tsx`: tab bar with four tabs — Today, Log, Weight, Profile. Token-driven styling.
- [ ] T7.5 — `app/(tabs)/index.tsx` (Today): hero `<Ring>` showing today's consumed kJ vs goal kJ with `<KJReadout>` inside. Below: deficit / remaining. Big "Log food" CTA → `/log`. Recent entries list.
- [ ] T7.6 — `app/(tabs)/log.tsx`: list of today's `FoodEntry`s. "Take photo" + "Pick from library" buttons via `expo-image-picker`. After image acquired: show preview, optional hint text input, submit button → `lib/openrouter/estimate.ts`. Display estimate (name, kJ, confidence, items) in an editable confirm card. Save button writes via `lib/state/log`.
- [ ] T7.7 — `app/(tabs)/weight.tsx`: list + line chart (`react-native-svg-charts`) of `WeightEntry`s. "Add weight" inline form. BMI badge based on most recent entry.
- [ ] T7.8 — `app/(tabs)/profile.tsx`: shows current profile, recomputed BMI/BMR/TDEE/daily goal. Edit button reopens the onboarding form pre-filled. Settings section: reminder interval slider/stepper, "Enable reminders" toggle (calls `lib/notifications`), "Show kcal helper" toggle.
- [ ] T7.9 — All energy values displayed primarily as kJ via `<KJReadout>`. `kcal` only as a small helper line, controlled by `Settings.show_kcal_helper`.
- [ ] T7.10 — All loading states use `<Button loading>` or skeleton via `<Card>` — no raw spinners outside primitives.

### Acceptance
- App boots clean → onboarding (when no profile) → tabs.
- Photo flow: pick → preview → submit → estimate → confirm → save → entry appears in Today + Log.
- Weight chart renders even with one data point.
- Notifications toggle persists and actually requests permission on enable.
- Onboarding cannot be submitted with missing required fields (basic inline validation).
- No screen imports `AsyncStorage` directly — only via `lib/state/*` or `lib/storage/*`.

---

## Lane 8: state-and-tests  (owner: impl-state)

**Reads (allowed):** `types/index.ts`, `lib/calc/*`, `lib/storage/*`
**Writes (owns):**
- `lib/state/index.ts`
- `lib/state/profile.ts`
- `lib/state/log.ts`
- `lib/state/weight.ts`
- `lib/state/settings.ts`
- `__tests__/state.test.ts`

### Tasks
- [ ] T8.1 — `profile.ts`: Zustand store with shape `{ profile: Profile | null; hydrated: boolean; hydrate(): Promise<void>; setProfile(p: Profile): Promise<void>; clearProfile(): Promise<void>; }`. Persists via `lib/storage/profile`.
- [ ] T8.2 — `profile.ts` selectors: `selectBMR`, `selectTDEE`, `selectDailyGoalKJ`, `selectBMI`, `selectBMICategory` — all derived from `profile` using `lib/calc`.
- [ ] T8.3 — `log.ts`: store `{ entries: FoodEntry[]; hydrated: boolean; hydrate(): Promise<void>; addEntry(e: FoodEntry): Promise<void>; removeEntry(id: string): Promise<void>; replaceEntry(e: FoodEntry): Promise<void>; }`. Persists via `lib/storage/foodLog`.
- [ ] T8.4 — `log.ts` selectors: `selectTodayKJTotal`, `selectTodayEntries`, `selectRemainingKJ(goalKJ)`.
- [ ] T8.5 — `weight.ts`: store `{ entries: WeightEntry[]; hydrated: boolean; hydrate(): Promise<void>; addEntry(e: WeightEntry): Promise<void>; removeEntry(id: string): Promise<void>; }`. Persists via `lib/storage/weightLog`.
- [ ] T8.6 — `weight.ts` selectors: `selectLatestWeight`, `selectWeightTrend(days)`.
- [ ] T8.7 — `settings.ts`: store `{ settings: Settings; hydrated: boolean; hydrate(): Promise<void>; setSettings(s: Settings): Promise<void>; patch(p: Partial<Settings>): Promise<void>; }`. Persists via `lib/storage/settings`.
- [ ] T8.8 — `index.ts`: helper `hydrateAll(): Promise<void>` calling each store's `hydrate()` in parallel; re-exports all stores and selectors.
- [ ] T8.9 — Tests in `__tests__/state.test.ts` (mock `lib/storage/*` to in-memory):
  - profile store: hydrate from empty → null; setProfile then hydrate again returns it.
  - log store: addEntry updates `selectTodayKJTotal`; removeEntry decrements it.
  - weight store: addEntry increases length; `selectLatestWeight` returns most recent.
  - settings store: defaults on empty; `patch` merges.
  - selectors derived from profile match `lib/calc` outputs.

### Acceptance
- Stores survive a hot-reload boundary in tests (recreatable via factory).
- Every write mutation also writes through to storage.
- No direct `AsyncStorage` calls — only via `lib/storage/*`.
- `npm test` passes for `__tests__/state.test.ts`.

---

## File-ownership matrix (sanity check)

| Path | Lane |
|------|------|
| `types/index.ts` | 1 |
| `lib/calc/energy.ts` | 2 |
| `lib/calc/bmi.ts` | 2 |
| `lib/calc/index.ts` | 2 |
| `__tests__/calc.test.ts` | 2 |
| `lib/storage/keys.ts` | 3 |
| `lib/storage/profile.ts` | 3 |
| `lib/storage/foodLog.ts` | 3 |
| `lib/storage/weightLog.ts` | 3 |
| `lib/storage/settings.ts` | 3 |
| `lib/storage/index.ts` | 3 |
| `__tests__/storage.test.ts` | 3 |
| `lib/openrouter/types.ts` | 4 |
| `lib/openrouter/client.ts` | 4 |
| `lib/openrouter/estimate.ts` | 4 |
| `lib/openrouter/index.ts` | 4 |
| `__tests__/openrouter.test.ts` | 4 |
| `lib/notifications/index.ts` | 5 |
| `lib/notifications/native.ts` | 5 |
| `lib/notifications/web.ts` | 5 |
| `lib/notifications/scheduler.ts` | 5 |
| `components/Screen.tsx` | 6 |
| `components/Text.tsx` | 6 |
| `components/Button.tsx` | 6 |
| `components/Card.tsx` | 6 |
| `components/Pressable.tsx` | 6 |
| `components/KJReadout.tsx` | 6 |
| `components/Ring.tsx` | 6 |
| `components/Hairline.tsx` | 6 |
| `components/Tag.tsx` | 6 |
| `components/index.ts` | 6 |
| `app/_layout.tsx` | 7 |
| `app/index.tsx` | 7 |
| `app/onboarding.tsx` | 7 |
| `app/(tabs)/_layout.tsx` | 7 |
| `app/(tabs)/index.tsx` | 7 |
| `app/(tabs)/log.tsx` | 7 |
| `app/(tabs)/weight.tsx` | 7 |
| `app/(tabs)/profile.tsx` | 7 |
| `lib/state/index.ts` | 8 |
| `lib/state/profile.ts` | 8 |
| `lib/state/log.ts` | 8 |
| `lib/state/weight.ts` | 8 |
| `lib/state/settings.ts` | 8 |
| `__tests__/state.test.ts` | 8 |

No path appears twice. Designer-owned files (`styles/tokens.ts`, `styles/typography.ts`, fonts under `assets/fonts/`) are not in any implementation lane and remain owned by the designer.
