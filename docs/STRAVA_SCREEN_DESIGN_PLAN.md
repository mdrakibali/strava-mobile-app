# Screen Design Plan and Design System

**Date:** 2026-11-19 · **Status:** implemented in this phase (see §8 for per-screen status)
**Inputs:** [UI/UX audit](STRAVA_UI_UX_AUDIT.md) (reference screens and problems) · [Product research](STRAVA_PRODUCT_RESEARCH.md) (behavior rules)

---

## 1. Design principles

1. **Map first, numbers second, chrome last.** Recording and activity screens lead with the route. Metrics are large and calm. Controls sit at the bottom, where thumbs are.
2. **One primary action per state.** Before start, the action is Start. While recording, it is Pause. While paused, it is Resume (with Finish secondary). On Save, it is Save.
3. **Numbers are the hero.** Use bold, tabular numerals with a small, sentence-case label (*label above value*, as in the reference feed and detail screens). No uppercase micro-labels.
4. **Honest UI.** No control without a working behavior behind it. Missing data shows "–" or the section is hidden, never a placeholder number.
5. **Pattern parity, original identity.** We follow Strava's proven interaction patterns (research §3) with our own colour, type and shape language.

---

## 2. Design system (`src/design/`)

### 2.1 Colour tokens (`tokens.ts`)
Light theme only for this phase. Tokens are structured so a dark theme can be added later by swapping the palette.

| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| `brand` | `#F25C19` | Primary buttons, live route line, active tab, kudos given | 3.3:1, so used for icons, the route line, and fills behind **bold ≥ 16 px** white text (counts as large text, ≥ 3:1). Body-size brand text uses `brandText`. |
| `brandPressed` | `#D64C0E` | Pressed state | — |
| `brandText` | `#C2410C` | Brand-coloured body text and links | 5.18:1 ✓ |
| `brandSoft` | `#FFF1E8` | Selected chip, sport circle background | — |
| `ink` | `#15171C` | Primary text, Finish button, metric values | 17.9:1 ✓ |
| `inkSecondary` | `#4A4F5A` | Secondary text and labels | 8.2:1 ✓ |
| `inkTertiary` | `#6E7480` | Captions, timestamps | 4.7:1 ✓ |
| `inkDisabled` | `#A3A8B2` | Disabled text only | — |
| `surface` | `#FFFFFF` | Cards, sheets | — |
| `canvas` | `#F3F4F6` | Screen background behind cards | — |
| `border` | `#E3E5E9` | Card borders, dividers | — |
| `borderStrong` | `#C9CDD4` | Input borders, outline buttons | — |
| `success` | `#1F9D5B` / soft `#E3F5EA` / text `#14532D` | "GPS ready" strip (dark-green text on soft green, as in the reference; white on `success` is only 3.5:1, so not used) | — |
| `warning` | `#F5C200` / soft `#FFF7D6` | **Paused** strip (ink text on yellow: 10.8:1 ✓) | — |
| `danger` | `#D92D20` / soft `#FDECEA` | Discard, errors | 4.8:1 ✓ |
| `info` | `#2563EB` | User-location dot only | — |
| `overlay` | `rgba(15,17,22,0.5)` | Sheet backdrop | — |

**Contrast values above are computed (WCAG 2.x relative luminance), not estimated.**

**Why `#F25C19` and not Strava's `#FC4C02`:** We keep the energetic warm family that fitness users read as "go", shifted to a different hue and saturation, so the app is not visually confusable with Strava's trademarked orange. The final brand colour is a product decision; it is one token.

### 2.2 Typography (Roboto, the Android system font)
| Style | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 64 / 70 | 700, tabular | Stats-view hero numbers |
| `metricXL` | 32 / 38 (auto-shrinks to fit) | 700, tabular | Recorder floating-card values |
| `metricL` | 24 / 30 | 700, tabular | Detail grid values |
| `metricM` | 18 / 24 | 700, tabular | Feed card values |
| `title1` | 26 / 32 | 700 | Screen titles, activity title on detail |
| `title2` | 20 / 26 | 700 | Feed card title, section headers |
| `title3` | 16 / 22 | 600 | Row titles, athlete names |
| `body` | 15 / 22 | 400 | Body copy, inputs |
| `label` | 13 / 18 | 500 | Metric labels (sentence case), secondary rows |
| `caption` | 12 / 16 | 400 | Timestamps, helper text |
| `button` | 16 / 20 | 700 | Buttons |

Rules: never below 12 px; no all-caps except the status strip on the recorder (short, bold, high contrast).

### 2.3 Spacing, radius, elevation
- **Spacing scale (4-pt):** `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32`. The screen gutter is **16**.
- **Radius:** `sm 8` (chips, inputs) · `md 12` (cards, fields) · `lg 20` (sheets, floating cards) · `pill 999` (buttons, Follow).
- **Elevation:** `card` (1 dp, border instead of shadow in lists) · `floating` (6 dp, map overlays and the floating metrics card) · `sheet` (12 dp).
- **Touch targets:** ≥ 44×44 dp (map overlay buttons 44, primary circle 84).

### 2.4 Components
| Component | Spec |
|---|---|
| `AppText` | `variant` prop (§2.2), `color` token, `tabular` for numbers. |
| `Button` | Variants `primary` (brand fill, white), `dark` (ink fill), `secondary` (canvas fill, ink), `outline` (border strong), `ghost`, `danger` (text-only red). Sizes `lg` (56 h, full-width CTAs), `md` (44), `sm` (32, pills such as Follow). `loading` replaces the label with a spinner and disables the button. Optional leading icon. |
| `IconButton` | Circle 44, white surface, floating elevation (map overlays), or plain (toolbar). Requires `accessibilityLabel`. |
| `Avatar` | Image, or **initials on a deterministic tint** when there is no URL. Sizes 32/40/48/72. No stock-photo fallback. |
| `AppBar` | 56 dp: optional back, title (title2), right actions. Used by every pushed screen. |
| `Card` | Surface, radius md, 1 px border, padding lg. |
| `MetricTile` | Label (label, inkSecondary) **above** value (metric style) + optional unit (smaller). Alignment start/center. |
| `MetricRow` | 2–3 `MetricTile`s in a row with even spacing (feed card, recorder card). |
| `SegmentedTabs` | Icon + label tabs with a 2 px brand underline (profile). |
| `Chip` | Pill, selected = brandSoft background + brand border + brandText. |
| `BottomSheet` | RN `Modal` (slide) with backdrop tap-to-close, a grab handle, a title, and safe-area bottom padding. No new dependency. |
| `SelectField` | Bordered 56-dp row: leading icon, value, chevron-down. Opens a sheet (sport, visibility). |
| `TextField` | Bordered input, radius md, 16 px padding, optional multiline. |
| `OptionRow` | Radio row with title and description (Who can view). |
| `ListRow` | Leading avatar or icon, title, subtitle, trailing element. |
| `StateView` | `loading` (skeleton or spinner), `empty` (icon, title, body, optional CTA), `error` (message + **Retry**). |
| `Skeleton` | Grey blocks for feed cards and the detail page. |
| `SportIcon` / sport config | One mapping (`src/lib/sports.ts`) for Run, Walk, Hike, Ride: icon, label, primary metric (pace or speed). |
| `RoutePreview` | **Static SVG polyline** of a route (no tiles), with start (green) and end (ink) dots, on a soft grid background, fit to bounds. Used in feed and profile lists. No map engine per list item. Renders nothing when there are no points. |
| `MapView` | MapLibre **v11** wrapper (`Map`, `Camera`, `GeoJSONSource`, `Layer`, `UserLocation`). Modes: `route` (fit bounds with padding) and `live` (follow the user with `trackUserLocation="course"`, draw the live line). Falls back to the existing Leaflet WebView only when the native module is absent (Expo Go). |
| `MapOverlayButton` | Floating `IconButton` used on maps (recenter, close/back). |

---

## 3. Navigation (MVP)

```
Bottom tabs:  [ Home ]   [ ● Record ]   [ You ]
                 │            │            │
                 │            └─ opens /record (full-screen modal) ─┐
                 │                                                  ├─ /save-activity (modal)
                 ├─ /activity/[id] ─ /athlete/[id]                  │
                 ├─ /search ─ /athlete/[id]                         │
                 └─ /notifications ─ /activity/[id] | /athlete/[id] │
You ─ /settings ─ /settings/profile-edit                            │
    ─ /activity/[id]                                                │
```
- Explore and Groups tabs are hidden (`href: null`) behind `FEATURES` flags (`src/config/features.ts`).
- **The Record tab opens the recorder directly** (`tabPress` → `router.push('/record')`), matching the reference bottom-nav behavior. While a recording is active, the Record tab shows a live dot.

---

## 4. Screen specifications

### 4.1 Home feed (`(tabs)/index.tsx`)
```
┌───────────────────────────────┐
│ Home                 🔍   🔔• │  AppBar (title, search, notifications + unread dot)
├───────────────────────────────┤
│ (●) Name                      │  FeedCard
│     Today at 6:42 AM · 🏃 Dhaka│   athlete row (avatar 40, title3, caption)
│ Morning Run                   │   title2
│ Distance   Pace      Time     │   MetricRow (label above value)
│ 5.02 km    5:41 /km  28m 33s  │
│ ┌───────────────────────────┐ │   RoutePreview (static SVG, 180 h, full-bleed)
│ │      ~~~route~~~          │ │
│ └───────────────────────────┘ │
│ 3 kudos · 1 comment           │   counts (caption)
│ [👍 Kudos]   [💬 Comment]      │   actions (kudos given = brand, disabled)
└───────────────────────────────┘
```
- **Data:** `GET /feed?tab=following` (own + followed), cursor pagination with `onEndReached`, pull to refresh. The client defensively hides other athletes' `ONLY_ME` items (server enforcement is Phase 0 work).
- **Kudos:** give-only (no un-kudo, as in Strava). Because the feed API doesn't report `hasKudos`, the first tap checks the activity detail (`hasKudos`) before posting, so a tap can never remove an existing kudos. Own activities show no kudos button.
- **States:** skeleton cards on first load; an error card with Retry; an empty state with "Record an activity" (primary) and "Find athletes" (secondary).

### 4.2 Choose a sport (bottom sheet)
Title "Choose a sport"; four rows: **Run, Walk, Hike, Ride**, each with an icon circle and a ✓ on the selected one. The selection persists as the "last sport" (AsyncStorage) and is preselected next time (research §1).

### 4.3 Recorder (`record.tsx`)
```
 ┌───────────────────────────────┐
 │ (⌄)                       (◎) │  close/minimize (never discards) · recenter
 │                               │
 │        LIVE MAP               │  MapView live: follows user, brand route line
 │                               │
 │ ┌───────────────────────────┐ │
 │ │  GPS READY  / RUN / PAUSED│⤢│  status strip: green / neutral / yellow; expand → stats view
 │ │ 00:12:41   5:38     2.25  │ │  Time · Avg pace (/km) or Speed (km/h) · Distance (km)
 │ │   Time    Avg pace  Distance│
 │ └───────────────────────────┘ │
 ├───────────────────────────────┤
 │ idle:     (🏃)    (▶ START)   │  sport button · big round Start
 │ recording:[   ❚❚  Pause     ] │  full-width pill
 │ paused:   [▶ Resume][⚑ Finish]│  brand + dark pills
 └───────────────────────────────┘
```
- **Stats view** (expand toggle): large Time, pace or speed, distance, plus a secondary row (Elevation, Calories est.) on white, as in the reference stats view.
- **GPS status before start:** a foreground location watch runs only while idle. Strip states: *Acquiring GPS…* (neutral), *GPS ready* (green, accuracy ≤ 20 m), *Weak GPS* (yellow, > 20 m), *Location off* (red, with a "Turn on" link). Start is always allowed (Strava allows starting before lock), but the strip makes the risk visible.
- **Metrics:** Time = recorder timer (excludes manual pauses). Runs, walks and hikes show **Avg pace** (moving time ÷ distance; shown after 50 m). Rides show **Speed** (current while moving, **average while paused**, per research §5).
- **Back / minimize:** closes the modal and leaves the recording running (in-app). The Record tab shows a live dot. Discard happens only from the Save screen with confirmation.
- **Finish → Save screen** *without* tearing down GPS, so **Resume** on the Save screen truly resumes (reference: Save screen's "Resume" pill).

### 4.4 Save activity (`save-activity.tsx`)
```
 [Resume]        Save Activity
 ┌ summary strip: 5.02 km · 28:33 · 5:41 /km · 12 m ┐
 ┌ RoutePreview ┐
 [ Morning Run                    ]  TextField (default: time-of-day + sport)
 [ How did it go?                 ]  TextField multiline
 [ 🏃 Run                       ⌄ ]  SelectField → Choose a sport sheet
 Visibility
 Who can view
 [ 👥 Everyone                  ⌄ ]  SelectField → Who can view sheet (3 OptionRows w/ descriptions)
 ⚠ inline error banner on failure (data is kept; tap Save to retry)
            Discard Activity           danger text → confirm dialog
 [          Save Activity          ]  sticky primary lg, loading state
```
- Sends **title, description, sport, visibility, start time, max speed and estimated calories** (fixes SYNC-01 and SYNC-06 on the client side).
- Fields with no backend persistence (photos, tags, perceived exertion, private notes, mute, hidden details) are **not shown** (see §7).
- On success, it replaces the stack with the new activity's detail. On failure, the recording is **kept** and an error is shown.

### 4.5 Activity detail (`activity/[id].tsx`)
```
 ┌── interactive MapView (route mode, 42% height) ── (‹) ──┐
 ╭───────────────────────────────────────────────╮
 │ (●) Name · Today at 6:42 AM · Dhaka   🔒 Only you│  athlete row (+ visibility badge for owner)
 │ Morning Run                                     │  title1
 │ description                                     │
 │ Distance        Moving Time                     │  2-col grid, centered (reference detail)
 │ 5.02 km         28:33                           │
 │ Avg Pace        Elevation Gain                  │
 │ 5:41 /km        12 m                            │
 │ Elapsed Time    Calories (est.)                 │
 │ Splits  (km · pace · elev)                      │  only if splits exist
 │ Elevation chart                                 │  only if ≥ 2 real points
 │ 👍 3 gave kudos            [Give kudos]          │
 │ Comments (n) + composer                         │
 ╰───────────────────────────────────────────────╯
```
- **Data:** `GET /activities/:id` mapped correctly (`res.athlete`, `res.kudosCount`, `res.hasKudos`, `res.comments`, `rawPolyline` for the owner else `maskedPolyline`).
- **States:** skeleton, then data. A 404 shows "This activity isn't available". Network errors show Retry. It **never** shows another activity.
- **Comments:** posted via the API and appended on success; an error is shown on failure.

### 4.6 Activity history and profile (`(tabs)/profile.tsx`, `athlete/[id].tsx`, shared `ProfileView`)
```
 You                                   🔍  ⚙
 (●72) Name
       Dhaka, Bangladesh
 12 followers • 8 following            (counts from the API; not tappable until list endpoints exist)
 [ Edit profile ]   [ Share profile ]   (other athletes: [ Follow / Following ])
 [📊 Progress] [〰 Activities]
 Progress:  (All)(Run)(Ride)(Walk)(Hike)
   This week  Distance · Time · Elev Gain
   Recent weeks bar chart (12 bars)
   note when the data window is incomplete
 Activities: compact FeedCards, newest first
```
- **Data:** `GET /athletes/:id` → `athlete` (real counts) + `recentActivities` (the 10 most recent; the owner sees all visibilities). Weekly totals and bars are computed from these and **flagged as incomplete** when the 10-item window doesn't cover the period (no invented totals). Full history needs a paginated endpoint (§7).
- **Other athletes:** a Follow / Following button calling the real toggle and using the server's returned state. Other athletes' `ONLY_ME` items are hidden client-side.
- **Logout** moves to Settings (no destructive action in the profile header).

### 4.7 Search athletes (`search.tsx`)
AppBar with a search field. Rows: avatar, name, city, **Follow / Following** pill (one API call; the UI uses the server's `isFollowing`). Loading, empty ("Search by name or city") and error states.

### 4.8 Notifications (`notifications.tsx`)
AppBar "Notifications" + "Mark all read". Rows: avatar with a type badge, message, relative time, unread dot. Tapping opens the activity or athlete.

---

## 5. Data and formatting rules (`src/lib/format.ts`)
- Distance: `5.02 km` (2 decimals < 100 km, 1 decimal ≥ 100 km).
- Duration: feed/summary `28m 33s` / `1h 5m`. Timers and detail `28:33` / `1:05:12`.
- Pace: `5:41 /km`. Shown as "–" when distance < 50 m. Speed: `24.3 km/h`.
- Elevation: `12 m`. Calories: `312 Cal` with "(est.)".
- Dates: `Today at 6:42 AM`, `Yesterday at …`, `November 1, 2026 at …`.
- Default title: `Morning/Afternoon/Evening/Night` + sport (05–12 / 12–17 / 17–21 / otherwise).
- **Calories (est.):** one MET-based function (research §7; technical audit MET-01). It is used live, on save and in display fallback, so the number the user sees while recording is the number stored. Weight defaults to 70 kg until the profile has a weight.

---

## 6. Accessibility checklist
Touch targets ≥ 44 dp. Every icon-only control has an `accessibilityLabel` and `accessibilityRole`. Text ≥ 12 px. Text contrast ≥ 4.5:1 (large ≥ 3:1). Status is never conveyed by colour alone (the strip always has text). Timers use tabular numerals so values don't jitter.

---

## 7. Backend gaps surfaced by the redesign (UI deliberately omits these)
| Missing capability | Effect on UI now | Needed endpoint (technical audit ref) |
|---|---|---|
| Followers/following lists | Counts are shown but not tappable | `GET /athletes/:id/followers|following` (SOC-01) |
| Kudos list | "N gave kudos" without avatars or a list | `GET /activities/:id/kudos` (Phase 4.5) |
| Full activity history + stats | Profile uses the 10 most recent and flags incomplete totals | `GET /athletes/:id/activities`, `/stats` (FE-04) |
| Activity edit/delete | No owner menu | `PATCH/DELETE /activities/:id` (SYNC-05) |
| Comment delete | Not offered | `DELETE /comments/:id` (SOC-04) |
| `hasKudos` in the feed | Extra detail fetch before giving kudos from the feed | feed `has_kudoed` (SOC-03) |
| Mute, perceived exertion, private notes, photos | Not shown on the Save screen | schema columns + R2 (SYNC-06, ADR-10) |
| **Privacy enforcement** | The UI now sends visibility. **The server still leaks ONLY_ME via following feed and profile** | Phase 0 (PRIV-01…03), **urgent** |

---

## 8. Implementation status (2026-11-19)

### 8.1 Verification performed
| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src` (config added: `eslint-config-expo` flat) | ✅ **0 issues in all redesigned/new files**. The whole `src/` has 9 errors and 29 warnings, all in **untouched** files: hidden out-of-scope screens (`analytics/*`, `messages/*`, `routes/*`, `event/*`, old `StravaMapView`, `LeafletMapView`), pre-existing issues in `auth/login.tsx`, and one pre-existing `exhaustive-deps` warning in `AppContext`. |
| `npx jest` (preset `jest-expo`, added) | ✅ 30 tests / 4 suites: `format`, `calories`, `activityView` (incl. the old wrong-field and fabricated-default cases), `social` (give-only kudos incl. the race, single follow call). |
| `npx expo export --platform android` | ✅ Bundle builds (5.7 MB Hermes bytecode). Verifies every import and route resolves for Android. |
| **On-device run** | ⛔ **Not completed.** The test Pixel 7a was connected over wireless ADB at the start of this phase but dropped before the build was ready ("No route to host"). I did not use an unrecognised device that appeared on the network. Screens are verified by type-check, lint, tests and bundle build only. **Visual and interaction QA on a device is still required** (§8.3). |

### 8.2 Screen status
| # | Screen | Status | Notes |
|---|---|---|---|
| 1 | Home feed | ✅ Complete | Following feed, cursor pagination, pull to refresh, skeleton, error/retry, empty state, "Recording · Return" banner. |
| 2 | Activity type selection | ✅ Complete | `SportSheet`: Run, Walk, Hike, Ride; remembers the last sport. |
| 3 | Recorder | ✅ Complete (needs device QA) | Live map + floating metrics card + status strip (GPS acquiring/ready/weak/denied/off, sport, PAUSED) + stats view. Minimize never discards. The recording engine itself is unchanged (still foreground-only; technical audit GPS-01…11). |
| 4 | Live map | ✅ Complete (needs device QA) | New MapLibre **v11** wrapper; the native map renders for the first time in this codebase. Follows the user, draws the live route, recenter button. Falls back to Leaflet only in Expo Go. |
| 5 | Pause / Resume / Finish | ✅ Complete | Pause → Resume (brand) + Finish (dark). Finish opens Save **without** tearing down GPS, so "Resume" on Save really resumes. |
| 6 | Activity summary (Save) | ✅ Complete | Sends title, description, **sport, visibility, start time**, max speed, estimated calories. A failed upload **keeps** the recording with inline retry. Discard is confirmed. Only persisted fields are shown. |
| 7 | Activity detail | ✅ Complete | Correct response mapping, map framing the route, 2-column stats, splits, elevation profile, give-only kudos, real comments, loading/not-found/error states. |
| 8 | Activity history | 🟡 Partial | Profile → Activities lists the **10 most recent** (all the API returns) with a visible note. Needs `GET /athletes/:id/activities` (paginated). |
| 9 | User profile | 🟡 Partial | Real counts, Follow/Following, Edit profile (now saves), Share. Progress card: this week + 12-week chart computed from the 10 recent activities, flagged when incomplete. Follower/following **lists** need backend endpoints. |
| 10 | Social feed interactions | ✅ Complete within API limits | Give-only kudos (no accidental un-kudo), comments, follow from search, profile and notifications. No kudos-giver list (no endpoint). |
| — | Search athletes | ✅ Complete | Single follow call per tap (old double-toggle bug fixed), debounced search, stale-response guard, states. |
| — | Notifications | ✅ Complete | Relative times; duplicate username removed; message links gated by feature flags. |
| — | Settings / Edit profile / Privacy zones | ✅ Complete | Settings lists only real entries. Profile edit calls `PUT /athletes/me`. **Privacy zones are now created at the device's location** (they were hard-coded to Dhaka). |
| — | Tabs / navigation | ✅ Complete | Home · Record · You. The Record tab opens the recorder. Explore and Groups hidden behind `EXPO_PUBLIC_FEATURE_EXPLORE/GROUPS`. |
| — | Login | 🟡 Partial | Trademark wordmark → `APP_NAME` constant; brand colour. The layout is not redesigned. The demo-login backdoor is still enabled server-side (SEC-02). |
| — | Onboarding (4 screens) | ⬜ Not redesigned | Collected preferences are not persisted. Out of this phase's priority list. |
| — | Out-of-scope modules | ⏸ Hidden | Files untouched; unreachable from MVP navigation. |

### 8.3 Device QA checklist (run on a development build)
1. Record tab → recorder opens; strip goes *Acquiring GPS…* → *GPS ready* outdoors; deny permission → red strip opens Settings.
2. Start → map follows you; route line draws; Time/Avg pace/Distance update; expand → stats view; minimize → Home shows the "Recording · Return" banner and the Record tab shows a live dot.
3. Pause → yellow PAUSED, Resume + Finish. Finish → Save. Resume on Save → back to the recorder, recording continues.
4. Save with **Only you** → the detail screen shows "Visible to: Only you". Verify in the DB that `visibility='ONLY_ME'` and `start_time` = actual start.
5. Airplane mode → Save → error banner, activity still present → disable airplane mode → "Try again" succeeds once.
6. Feed: pull to refresh, scroll to load more, give kudos from a card (button becomes "Kudos given" and cannot be undone), open detail → map frames the route.
7. Profile: Progress chips/week/12-week chart; Activities list; Edit profile saves and persists after app restart.
8. Privacy zones: add at the current location; delete.
9. Large font scale (Settings → Display → Font size max): the recorder card values shrink to fit and no text overlaps.

### 8.4 Known limitations carried forward
- **Server privacy is still not enforced** (technical audit PRIV-01…04). The client hides others' `ONLY_ME` items as defence in depth only. **Ship Phase 0 before any real users**, especially now that the client correctly sends "Only you".
- Recording is still foreground-only and in-memory (Phase 2 of the implementation plan): screen-off recording and crash recovery are not solved by this UI work.
- Feed route previews are schematic (SVG line, no basemap tiles). Upgrade path: MapLibre `StaticMapImageManager` or server-rendered static maps.
- `src/components/common/{ActivityCard,Header,RouteMapPreview,ShareModal,StatBox,EmptyState}.tsx` and `components/map/StravaMapView.tsx` are now used only by hidden screens. Delete them when those modules are removed or rebuilt.
- The product name (`src/config/app.ts`) still contains "Strava", which is a trademark. Needs a team decision.
- Dark mode is not implemented (tokens are structured for it).
