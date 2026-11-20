# UI/UX Audit: Existing Frontend vs. Real Strava Behavior

**Date:** 2026-11-19 · **Baseline commit:** `1f954d8`
**Scope:** every route in `mobile-frontend/src/app/` and every component in `mobile-frontend/src/components/`.
**Companion docs:** [Screen design plan](STRAVA_SCREEN_DESIGN_PLAN.md) · [Technical audit](STRAVA_TECHNICAL_AUDIT.md) · [Product research](STRAVA_PRODUCT_RESEARCH.md) · [Architecture decisions](STRAVA_ARCHITECTURE_DECISIONS.md)

---

## 1. Reference material used

### 1.1 Recorded Strava app screens (primary visual reference)
I studied **243 recorded screens** of the current Strava app on ScreensDesign (replay `av=4244`, recorded 2026). The recording is the **iOS** app; Android uses the same information architecture with Material controls (research §1–§15 cover the Android-specific behaviors). Key screens:

| Flow | Reference screens (ScreensDesign) | What they establish |
|---|---|---|
| Record, before start | [374878](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374878&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | Full-screen map. A floating metrics card (Time · Avg pace · Distance) with a coloured status strip **"GPS Acquired"**. A bottom sheet with **sport button · large round Start · Add Route**. Map controls (layers, 3D, recenter) on the right. A close chevron top-left. |
| Record, stats-only view | [374717](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374717&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | Expanding the card gives a full-screen stats view: a large timer, a very large pace and distance, and split placeholders. |
| Record, recording | [374732](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374732&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | The status strip shows the **sport name**. The route draws live on the map. The bottom sheet holds a **single full-width Pause** pill. |
| Record, paused | [374733](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374733&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | A **yellow "Paused"** strip. The bottom sheet holds **Resume (brand colour) + Finish (black)** side by side. |
| Choose a sport | [374715](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374715&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | A bottom sheet "Choose a Sport", "Your Top Sports" circles, then grouped lists (Foot / Cycle), with a check on the selected sport. |
| Save Activity | [374734](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374734&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail), [374750](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374750&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | A **"Resume"** pill top-left and a "Save Activity" title. Bordered field rows (title, description, sport). Visibility → "Who can view" select. Mute toggle. A red **"Discard Activity"** text button. A sticky brand-colour **Save Activity** button. |
| Who can view | [374747](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374747&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | A sheet with three radio options, each with an explanatory line (Everyone / Followers / Only You). |
| Home feed card | [374837](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374837&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail), [374809](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374809&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | Avatar, name, "Yesterday at 5:16 AM · device", location with sport icon. A **large bold title**. **Three stats with the label above the value** (Distance · Pace · Time). A **full-bleed map**. "19 gave kudos" with avatars. An action row (kudos · comment · share). |
| Activity detail | [374822](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374822&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail), [374861](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374861&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | Map in the top half with floating back and overflow buttons. A rounded sheet with the athlete row (+ Follow pill), a title, and a **centered 2-column stats grid** (Distance, Elevation Gain, Moving Time, Avg Pace, Calories). |
| Discussion / Kudos list | [374811](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374811&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail), [374815](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374815&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | Flat comments with a composer at the bottom. A kudos list grouped as "Athletes you follow" / "Other athletes" with Follow buttons. |
| Profile ("You") | [374911](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374911&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail), [374752](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374752&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | Avatar, name, "N activity", "N followers • N following". **Edit profile / Share profile** outline buttons. Icon tabs **Progress · Activities · More**. Progress card: sport chips, **This week** (Distance, Time, Elev Gain), **Past 12 weeks** chart. |
| Search athletes | [374842](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374842&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | A search field, then rows with avatar, name, location, follower count, and a **Follow** pill. |
| Notifications | [374860](https://screensdesign.com/apps/strava-run-bike-hike/?vs=374860&utm_source=screensdesign&utm_medium=mcp&utm_content=screen_detail) | A simple list: avatar, bold message, secondary line, timestamp. |
| Bottom navigation | all core screens | **Home · Maps · Record · Groups · You**. Record is a tab that opens the recorder. |

### 1.2 Official behavior
Behavior rules come from [STRAVA_PRODUCT_RESEARCH.md](STRAVA_PRODUCT_RESEARCH.md) (official support articles). Examples: runs show split average pace while recording; rides show current speed while moving and average speed when paused; manual pause needs manual resume; Discard is irreversible; kudos can't be taken back.

### 1.3 What we deliberately do not copy
Strava's **logo and wordmark**, its exact brand orange (`#FC4C02`), its shield-shaped avatars, its proprietary map styles and heatmaps, subscription surfaces, and the "Strava" name in UI copy. We adopt the **interaction patterns** (which are common fitness-app conventions) and build an original visual system on top (see the design plan §2).

---

## 2. Cross-cutting findings

| # | Area | Problem | Evidence | Severity |
|---|---|---|---|---|
| X-1 | **Maps** | **The native MapLibre map has never rendered.** `StravaMapView` does `require('@maplibre/maplibre-react-native').default` and uses `MapLibreGL.MapView`, `ShapeSource`, `LineLayer` and `PointAnnotation`. Those are the **v10** API. The installed package is **v11.5.1**, which has **no default export** and exposes `Map`, `Camera`, `GeoJSONSource`, `Layer`, `UserLocation` and `Marker`. So `isMapLibreAvailable` is always false, and **every map in the app is the Leaflet WebView fallback** (raw OSM tiles, Leaflet loaded from unpkg at runtime). | `components/map/StravaMapView.tsx:27-35`; `node_modules/@maplibre/maplibre-react-native/lib/typescript/module/index.d.ts` | Critical |
| X-2 | Maps | The camera uses `defaultSettings` only. It never fits the route or follows the user, so `autoFitRoute`/`followUser` are ignored. Attribution is hard-coded "© CARTO" even when OSM/ArcGIS tiles are shown. | `StravaMapView.tsx:145-150, 244-248` | High |
| X-3 | Maps | **`RouteMapPreview` draws an invented route around Dhaka** when an activity has no GPS points, so feed cards show routes that never happened. Every feed card also mounts a full map (WebView) instance. | `components/common/RouteMapPreview.tsx:16-24`; `ActivityCard.tsx:169` | Critical |
| X-4 | Fake data | Hard-coded numbers presented as the user's data. Profile: "348.6 km Total", "Avg: 29.0 km / week", "Peak: 40.2 km", "Weekly Mileage Goal 32.5 / 40.0 km", following/followers fallbacks 24/118. Mappers: followers 142, avg HR 150, relative effort 45. Elevation chart: a sample profile when there is no data. City "Dhaka/Manhattan" defaults. | `(tabs)/profile.tsx:153-191, 103-114`; `context/AppContext.tsx:79-104`; `ElevationChart.tsx:11` | Critical |
| X-5 | Fake interactions | Buttons that claim success without doing anything: Profile Edit "Profile Updated" (no API call), Share sticker "shared to Instagram", Block athlete alert, "Add Photos" alert, Beacon toggle, GPS settings, notification settings, data export, GPX import, report. The header "+" menu links to non-existent routes (`/manual-entry`, `/post/create`); the profile links to `/safety/beacon`; the maps tab links to `/routes/saved` (none exist). | files listed in §3 | High |
| X-6 | Broken data binding | The activity detail screen reads `res.activity.kudosCount / comments / polyline / athlete`, which don't exist (the API returns them at top level, and the polyline as `rawPolyline`/`maskedPolyline`). So the detail map is always empty, it always shows "0 comments, No kudos", and the athlete is "Athlete, Manhattan, USA". On error it shows `activities[0]`, a **different activity**. | `app/activity/[id].tsx:34, 60-99` | Critical |
| X-7 | Social logic | Feed "Following" filter uses `athlete.isFollowing`, which the mapper hard-codes to false, so it shows only your own posts. "My Clubs" filters nothing. Search **toggles follow twice per tap** (context `toggleFollowAthlete` → API, plus a direct API call), so it is a no-op. The detail-screen Follow is local state only. Kudos toggle state is unknown in the feed (`hasKudos:false` from the server), so a tap can *remove* a kudos. | `(tabs)/index.tsx:31-36`; `search.tsx:55-61`; `activity/[id].tsx:213`; technical audit SOC-03 | High |
| X-8 | Visual system | There is no design system in use. `constants/theme.ts` exists but almost nothing imports it. The brand hex `#FC4C02` (Strava's) is hard-coded **hundreds of times**. Styling mixes NativeWind classes (RC version) and inline styles. Font sizes go from 8 px to 60 px with no scale. Uppercase micro-labels (9–11 px, `font-black`) are used everywhere and are hard to read. | `grep -c FC4C02` across `src/`; `constants/theme.ts` | High |
| X-9 | Navigation | Five tabs (Home, Explore, Record, Groups, You). Explore and Groups are out of MVP scope (ADR-15) and partly fake. The Record tab is a "Workout" screen with sport cards whose **Start buttons begin recording immediately**, before the recorder UI is visible. The header shows a "STRAVA" wordmark. | `(tabs)/_layout.tsx`; `(tabs)/record-tab.tsx:16-19`; `components/common/Header.tsx:16` | High |
| X-10 | States | Most screens have no error state (failures are `console.warn` only). Loading is either a full-screen spinner or nothing. Empty states are inconsistent. The feed shows a global pull-to-refresh spinner during the initial load. | across screens | Medium |
| X-11 | Branding / IP | "STRAVA" wordmark on Home and Login, "Log In to Strava", "Strava Live Beacon", "Open Strava" in share text, Strava's exact orange. | `Header.tsx:16`; `auth/login.tsx:233,334`; `(tabs)/profile.tsx:62,201` | High (legal) |
| X-12 | Accessibility | Touch targets under 40 dp (icons with `p-1`), 9–10 px text, grey-on-grey (`text-gray-400` on white = 2.5:1), no `accessibilityLabel` on most icon buttons, no `accessibilityRole`. | across screens | Medium |

---

## 3. Screen-by-screen classification

Verdicts: **KEEP** (works, consistent), **REFACTOR** (behavior right, structure or style wrong), **REDESIGN** (behavior OK or fixable, layout/IA wrong), **REPLACE** (concept wrong or fake; build anew), **HIDE** (out of MVP scope per ADR-15; unreachable from navigation, files kept).

### 3.1 MVP screens

| Screen | Verdict | Layout / hierarchy | Data and behavior | States |
|---|---|---|---|---|
| `(tabs)/_layout.tsx` | **REDESIGN** | 5 tabs; avatar tab icon loads a stock photo; Strava's orange | Explore and Groups out of scope; the Record tab is a separate "Workout" page | — |
| `(tabs)/index.tsx` Home feed | **REDESIGN** | Header wordmark + "+" menu to dead routes; filter chips; "Weekly Volume" card | Loads the **global** feed (`tab=all`), first page only; broken Following/Clubs filters; weekly volume sums *everyone's* distance | No error state; initial load is a spinner over an empty list |
| `components/common/ActivityCard.tsx` | **REPLACE** | Four cramped stats incl. elevation; uppercase 10 px labels; GAP/"Relative Effort" badges (fabricated) | Live map per card; fake route fallback; kudos toggle can un-kudo; share opens a fake sticker modal | — |
| `(tabs)/record-tab.tsx` | **REPLACE** | Three sport cards with Start buttons | Starts recording before showing the recorder | — |
| `record.tsx` Recorder | **REDESIGN** | Telemetry-only, no map; mixed `className` and inline styles | Big timer shows **moving** time; pace is average but labelled as current; the back button offers "Discard" as the escape; settings modal exposes **simulation** and a dead beacon toggle; sport icon map shows `fitness` for Walk/Hike | No GPS pre-start state (recording begins without a fix) |
| `components/record/SportPickerModal.tsx` | **REPLACE** | Swim/Surf both map to `Workout` (duplicate keys) | Offers sports that the recorder treats identically | — |
| `components/record/RecordSettingsModal.tsx` | **REPLACE** (remove from MVP) | — | Simulation toggle (produces fake activities) and a non-functional beacon | — |
| `save-activity.tsx` | **REDESIGN** | Close to Strava's structure, but uses an icon back arrow instead of "Resume" | **Sport change, tag, perceived exertion, private notes and photos are discarded**; visibility not sent (fixed in this phase on the client); on failure the recording is discarded | No error state; no discard path |
| `activity/[id].tsx` Detail | **REDESIGN** | Long scroll of cards; HR and "matched segments" sections shown regardless of data | X-6 (wrong field mapping); fake Follow; kudos/comment updates only the feed copy | No loading or not-found state (falls back to another activity) |
| `components/activity/ActivitySplitsTable.tsx` | **REFACTOR** | Uppercase micro headers; "AVG HR" column shows fabricated 154 bpm values from the recorder | — | — |
| `components/common/ElevationChart.tsx` | **REFACTOR** | Header label "Gain" shows max−min (not gain) | Sample data when empty | — |
| `components/activity/HeartRateIntensityCard.tsx`, `AthleteIntelligenceCard.tsx`, `BestEffortsSection.tsx`, `MatchedSegmentsSection.tsx` | **HIDE** (remove from MVP screens) | — | No real data source (no HR sensors; no segment matching) | — |
| `(tabs)/profile.tsx` "You" | **REDESIGN** | Header with a logout icon (destructive action one tap away); uppercase tabs | History derived from the first 15 global feed items; X-4 fabricated stats and goal | No loading or error state |
| `athlete/[id].tsx` Athlete profile | **REDESIGN** | — | Real profile and follow, but: fake "Best Efforts", dead Message link, fake Block; `paceFormatted` falls back to the literal "5:00 /km" | Spinner only; no error state |
| `athlete/followers.tsx`, `athlete/following.tsx` | **REPLACE** → hidden until the backend endpoint exists | — | Show **search results**, not followers (no backend endpoint) | — |
| `athlete/suggested.tsx` | **HIDE** | — | "Suggested" = generic search | — |
| `search.tsx` | **REDESIGN** | Pill search field OK; `@username` in brand colour reads as a link | Double follow toggle (X-7) | Has loading and empty states |
| `notifications.tsx` | **REFACTOR** | Uses RN `SafeAreaView` (deprecated); unread tint uses brand colour | Real data; tapping MESSAGE goes to hidden messages | Empty state OK |
| `components/common/Header.tsx` | **REPLACE** | "STRAVA" wordmark; "+" menu to non-existent routes; messages icon (out of scope) | — | — |
| `components/common/StatBox.tsx`, `EmptyState.tsx`, `SkeletonLoader.tsx` | **REPLACE** with design-system components | inconsistent sizes | — | — |
| `components/common/ShareModal.tsx` | **REPLACE** (remove) | — | Fake "sticker shared" alert | — |
| `components/common/KudosModal.tsx` | **HIDE** | — | No kudos-list endpoint yet | — |
| `components/common/RouteMapPreview.tsx` | **REPLACE** | — | X-3 | — |
| `components/map/StravaMapView.tsx` | **REPLACE** | — | X-1, X-2 | — |
| `components/map/LeafletMapView.tsx`, `MapFallbackView.tsx` | **KEEP temporarily** (Expo Go fallback only) | — | Remove once everyone uses dev builds (ADR-14) | — |
| `settings/index.tsx` | **REFACTOR** | — | Links to six fake sub-screens; units toggle not persisted | — |
| `settings/profile-edit.tsx` | **REFACTOR** | — | **Fake save** although `PUT /athletes/me` exists | — |
| `settings/privacy.tsx` | **REFACTOR** (out of this phase) | — | Privacy zones are real; beacon and emergency phone are fake | — |
| `settings/gps.tsx`, `settings/notifications.tsx`, `settings/blocked-users.tsx`, `settings/data-export.tsx`, `settings/import-gpx.tsx`, `settings/report.tsx` | **HIDE** | — | Not persisted / no backend | — |
| `auth/login.tsx` | **REFACTOR** (branding) | "STRAVA" wordmark, "Log In to Strava" | Demo login enabled (backdoor, SEC-02) | — |
| `onboarding/*` (4) | **REFACTOR** (later) | — | Collected preferences are not persisted | — |
| `index.tsx`, `_layout.tsx` (root) | **KEEP** | — | Auth guard works | — |

### 3.2 Out-of-scope screens: HIDE
`(tabs)/maps.tsx`, `(tabs)/groups.tsx`, `analytics/*` (9 screens), `challenge/*` (2), `club/*` (3), `event/*` (2), `routes/*` (3), `segment/[id].tsx`, `messages/*` (2), `components/groups/*`. These are removed from navigation and entry points (tabs hidden with `href: null`; links removed from MVP screens). Files are kept so they can be revived individually after their own audit.

---

## 4. Problems by design dimension (MVP screens)

| Dimension | Findings |
|---|---|
| **Layout** | The recorder has no map. Feed cards bury the title under the athlete row with 4 equal stats and badges. The detail page is a long vertical stack of unrelated cards without the map-first structure. Profile mixes a progress card and a fake goal card. |
| **Visual hierarchy** | Everything is `font-black`, so nothing stands out. Titles (18 px) compete with stats (20 px black) and badges. The primary action on the recorder competes with the header settings icon and the GPS text. |
| **Typography** | 14+ distinct sizes, many 9–11 px. Uppercase tracking-wide labels everywhere. Monospace timer (`font-mono`) looks off-brand on Android. No tabular numerals, so timers jitter as digits change. |
| **Spacing** | Arbitrary `p-3/p-4/py-3.5/mb-3/space-x-*`. NativeWind `space-*` and `gap-*` are applied inconsistently. Cards in the feed have both an outer margin and an inner border radius 12, while the map preview has radius 16. |
| **Colours** | Strava's exact brand orange. Five additional accent colours (blue pace, purple elevation, amber, emerald) appear without meaning. Grey 400 text fails contrast. |
| **Navigation** | Out-of-scope tabs. The Record tab is an intermediate page. The header "+" menu leads to 404s. Logout sits in the profile header. Destructive "Discard" is offered from the recorder's back button. |
| **Component consistency** | Three different button styles for Follow (rounded-lg, rounded-full, rounded-xl), three empty-state styles, two modal styles. |
| **Map interaction** | No native map (X-1). The camera doesn't frame routes. A fake route fallback. Duplicate zoom +/- controls on small previews. No user-follow on a live map (no live map at all). |
| **Information presentation** | Pace shown as `5:30 /km` in some places and `5:30` in others. Moving time `65:00` instead of `1:05:00`. Elevation shown on every card even for flat walks. "GAP" is plain pace mislabelled. Relative Effort is invented. |
| **Empty states** | The feed shows "Discover Athletes"; the profile shows a generic one; there is no first-activity guidance. |
| **Loading states** | Spinners only; no skeletons. The detail page renders fallback data before the real data (flash of a wrong activity). |
| **Error states** | Practically none. Network errors are swallowed with `console.warn`, and the save screen showed success even on failure. |

---

## 5. Constraints that shape the redesign
1. **No backend changes in this phase** (per instruction). Where the backend lacks an endpoint (followers list, kudos list, comment delete, activity edit/delete, full history), the UI **does not pretend**. The control is omitted and the gap is listed in the design plan §7.
2. **No new native modules**, so the development build already installed on the test device keeps working. Everything is built with existing dependencies (`react-native-svg`, `expo-location`, MapLibre, AsyncStorage).
3. **Recording engine stays as-is** (its rebuild is Phase 2 of the implementation plan). The UI is built against its current API, with three small, behavior-preserving additions (start timestamp, finish-without-teardown flow, non-destructive save failure).
4. The backend privacy fixes (technical audit Phase 0) are still required before real users. The UI now **sends** the visibility the user picks, which makes those server fixes urgent rather than optional.
