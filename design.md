# Antichud — Design System v1

## Concept: "Energy Table"

Antichud is dressed like a **1960s physics-journal energy table** reborn as a phone app. The app measures, it doesn't motivate; the typography, the hairline rules, and the **kJ-as-unit-of-record** all point at the same idea — *this is an instrument, not a coach.* A serif display sets a quietly authoritative tone, a precise grotesque carries the body, and a tabular monospace handles every numeric readout so digits column-align like data in a printed table.

The aesthetic is **editorial / scientific**: cream paper, deep ink, hairline rules, one molten-orange accent reserved for the energy axis. No purple gradients. No emoji. No motivational copy. The numbers *are* the design.

---

## Typography

| Role        | Family                | Weights        | Source                                  |
|-------------|-----------------------|----------------|-----------------------------------------|
| Display     | **DM Serif Display**  | 400, 400 italic | `@expo-google-fonts/dm-serif-display`   |
| Body / UI   | **Work Sans**         | 400, 500, 600  | `@expo-google-fonts/work-sans`          |
| Mono / kJ   | **JetBrains Mono**    | 400, 500, 700  | `@expo-google-fonts/jetbrains-mono`     |

Rationale: DM Serif Display has a sharp, narrow ductus reminiscent of mid-century editorial titling (Bodoni-adjacent, but more contemporary). Work Sans is a humanist grotesque with quiet personality — *not* Inter, *not* Roboto, *not* Space Grotesk. JetBrains Mono is a technical monospace with tabular numerals and a slashed zero — perfect for the kJ readout where digit columns must align.

### Type scale (pt)

```
12  caption / micro-label (UPPERCASE, tracked +120/1000)
14  bodySm — secondary text, kcal helper readout
16  body — primary running text
18  label — form labels, list items
22  headline — section heads (Work Sans 600)
28  displaySm — screen titles (DM Serif Display)
40  display — onboarding titles, profile name
64  hero — the daily kJ readout (JetBrains Mono 700, tabular)
```

Letter-spacing: micro-labels +120/1000 (uppercase), display 0, body -5/1000.
Line-height: body 1.45, display 1.05, mono 1.0.

---

## Color

### Light (default — "paper")

| Token        | Hex       | Use                                         |
|--------------|-----------|---------------------------------------------|
| `paper`      | `#F4EFE6` | App background — warm cream, not white      |
| `paperDeep`  | `#EBE4D6` | Cards, recessed surfaces                    |
| `ink`        | `#15130F` | Primary text — almost-black warm             |
| `inkSoft`    | `#5C564B` | Secondary text                              |
| `rule`       | `#15130F` | Hairline borders (0.5px @ 100% opacity)     |
| `ember`      | `#E8472C` | The energy accent — a molten orange-red     |
| `emberSoft`  | `#F2C8B6` | Tint of ember — fills, hover                |
| `signal`     | `#1F6F4A` | Positive (under goal, stable weight)        |

### Dark ("ink")

| Token        | Hex       | Use                                         |
|--------------|-----------|---------------------------------------------|
| `paper`      | `#0E0D0A` | Background — coal, slight warm              |
| `paperDeep`  | `#161410` | Cards                                       |
| `ink`        | `#F0EAD8` | Primary text — warm bone                    |
| `inkSoft`    | `#8A8273` | Secondary text                              |
| `rule`       | `#F0EAD8` | Hairlines (0.5px @ 60% opacity)             |
| `ember`      | `#FF6B47` | Energy accent — slightly brighter for dark  |
| `emberSoft`  | `#3A1E15` | Tint of ember                               |
| `signal`     | `#46B881` | Positive                                    |

The dark mode is **not an inversion** — it's coal-and-bone with a brighter ember. The ember accent shifts because #E8472C reads dull on dark.

---

## Spacing (4-pt base)

```
4  8  12  16  24  32  48  64  96
```

Body padding: 24. Card padding: 16. List-row vertical: 12. Section gap: 32.

---

## Radius / borders

**Sharp.** Radius scale: `0, 2, 4, 999`.
- Cards, inputs, buttons: `0` or `2` — this is editorial, not soft.
- Pills, avatars: `999` (only when needed).
Borders are **hairlines**: `StyleSheet.hairlineWidth` (~0.5px on web, 0.33–0.5px on device) at 100% opacity. Never thicker than 1px outside of the ember accent rule under hero numbers (which is 2px ember).

---

## Motion

Three signature animations — used sparingly, never decorative.

1. **Digit roll-in** on the hero kJ readout: each digit animates from `+8px translateY` with 30ms stagger and a `cubic-bezier(0.2, 0.8, 0.2, 1)` curve. 240ms total.
2. **Tape sweep** on the daily-energy bar: the measurement-tape fill sweeps left→right on mount with `withTiming(value, { duration: 600, easing: Easing.out(Easing.cubic) })`. Tick marks fade in after the fill passes them.
3. **Capture flip**: when a photo is taken and sent to Gemini, the frame flips through three states (captured → analyzing → result) with a 180° rotateY between each, 320ms each, masking the AI latency behind perceived motion.

No bouncy springs. No ease-in-out everywhere. Be precise.

---

## Iconography

Stroke-based, **1px** hairline strokes, 24px artboard. We use `lucide-react-native` (already React-Native compatible) but force `strokeWidth={1}` and color `t.ink`. Allowed icons only: `Camera`, `Plus`, `ChevronRight`, `Scale`, `User`, `Bell`, `Calendar`, `TrendingUp`, `TrendingDown`, `X`, `Check`, `Settings`. No filled icons. No colored icons.

---

## Signature element: **Measurement Tape**

Every screen with a "current vs goal" relationship — daily kJ, weight progress, BMI band — uses a horizontal **measurement-tape** component instead of a ring or bar. Specifications:

- Tape height: 56px. Background: `paperDeep`. Fill: `ember`.
- Tick marks every 500 kJ (or 1 kg / 1 BMI unit), drawn as 1px hairlines from top of tape descending 12px (minor) or 24px (major, every 2000 kJ).
- Major tick labels in JetBrains Mono 12pt, sitting above the tape.
- A vertical 2px ember **needle** marks the current value — like a slide rule.
- The label on the left is the unit (uppercase Work Sans 12pt: `KILOJOULES`); on the right, the target value in mono.

This is the "thing someone remembers." It shows up on Home (today's kJ vs goal), Weight (current vs target), and Profile (BMI band).

The hero number (today's kJ) sits **above** the tape in JetBrains Mono Bold 64pt, tabular numerals, with the unit `kJ` in DM Serif Display 28pt italic immediately following at the baseline. A 2px ember underline runs the full width of the number.

---

## Layout grammar

- 4-column implicit grid on mobile, 12-column on web ≥768px.
- Section titles always set in DM Serif Display, **left-aligned**, **lowercase**, with a hairline rule below extending the full content width.
- Micro-labels above every value (`UPPERCASE WORK SANS 500 12PT TRACKED +120`).
- All numbers right-aligned in tables, tabular figures.

---

## What we will NOT do

- No avatar circles, no progress rings, no purple gradients, no emoji, no neumorphism, no glass-morphism.
- No motivational copy ("You got this!"). Copy is observational ("2,140 kJ logged. 4,360 kJ remaining.").
- No drop shadows softer than `0 1px 0 rule` (a hairline). Elevation is conveyed by hairline rules, not shadows.
- No animation longer than 600ms. No bounce.
