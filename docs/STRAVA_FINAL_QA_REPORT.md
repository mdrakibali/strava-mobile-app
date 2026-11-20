# Final QA Report: Phases 3–5

**Date:** 2026-11-20 · **Code state:** commit `f5eadfc` (you committed the work as it progressed; only these three docs are uncommitted) · **Deployed:** nothing (backend and migrations not deployed)

**Status words in this report**
- **VERIFIED (auto):** covered by an automated test that ran and passed in this session.
- **VERIFIED (HTTP E2E):** exercised over real HTTP against the local server (`scripts/e2e-local.mjs`, 23/23 passed).
- **BUILD-VERIFIED:** compiles, type-checks and bundles, but no person has used it on a phone yet.
- **NOT DEVICE TESTED:** needs a physical Android phone. The Pixel 7a was disconnected for this whole session (`adb devices` empty, no mDNS services), so **no on-device test was run**.

Nothing is marked COMPLETE on the strength of a build alone. GPS accuracy, background recording, screen lock, kill-recovery and battery behaviour are **not** claimed as tested.

---

## 1. Phase 4 summary: social features

| Feature | Backend | App | Status |
|---|---|---|---|
| User profile (identity, counts, activity count) | `GET /athletes/:id` (public DTO whitelist; email only to self) | Profile screen (You tab and other athletes) | VERIFIED (auto) API · BUILD-VERIFIED UI |
| Profile statistics | **New** `GET /athletes/:id/stats`: per-sport year-to-date and all-time totals, 12 Monday-based weeks, **policy-aware** | Progress tab: this week, 12-week chart (server buckets, no longer only the 10 recent activities), this year, all time, sport filter | VERIFIED (auto) |
| Profile editing | `PUT /athletes/me` | Edit profile | BUILD-VERIFIED |
| Follow / unfollow | **New** idempotent `PUT`/`DELETE /athletes/:id/follow`; legacy toggle kept for old builds; one notification per new follow; no self-follow | Profile, followers/following lists, search, suggested | VERIFIED (auto + HTTP E2E) |
| Followers / Following lists | **New** `GET /athletes/:id/followers` and `/following` (cursor pagination, viewer's follow state per row) | **Rebuilt.** The old screens showed *search results* as "followers". Counts on the profile are now tappable. | VERIFIED (auto) API · BUILD-VERIFIED UI |
| Activity feed | Following feed with the visibility policy, row-value cursor, real `hasKudos`, subquery counts, `Cache-Control: no-store` | Home: refresh, pagination, focus refresh, reload after upload | VERIFIED (auto + HTTP E2E) |
| Public / Followers / Only me | One policy (`lib/policy.ts`) for detail, feed, history, profile, stats, kudos, comments, export; invisible = 404 | Save and Edit screens set visibility | VERIFIED (auto: 4 viewers × 3 visibilities × 7 surfaces) |
| Kudos: give | `PUT` (and legacy `POST`) `/activities/:id/kudos`, idempotent, unique index, no self-kudos, notification only on new kudos | Kudos button on **every** feed card and on detail (own activity: opens the list) | VERIFIED (auto + HTTP E2E) |
| Kudos: remove | **New** `DELETE /activities/:id/kudos` (idempotent) | Tap again to remove (optimistic, rolled back on error) | VERIFIED (auto + HTTP E2E) |
| Kudos: count and own state | Feed and detail return `kudosCount` + `hasKudos` | Shared social store keeps feed ⇄ detail ⇄ list consistent; server data always wins | VERIFIED (auto) |
| Kudos: who gave | **New** `GET /activities/:id/kudos` (paginated, visibility-checked) | **New** Kudos list screen | VERIFIED (auto) API · BUILD-VERIFIED UI |
| Comments: add / list | `POST` (1–1000 chars, trimmed), **new** paginated `GET /activities/:id/comments` | Detail screen composer | VERIFIED (auto + HTTP E2E) |
| Comments: edit | **New** `PATCH …/comments/:cid`, author only, sets `updated_at` | "…" menu → inline edit, "(edited)" label | VERIFIED (auto) |
| Comments: delete | **New** `DELETE …/comments/:cid`, author **or** activity owner | "…" menu → confirm | VERIFIED (auto) |
| Sharing | — | System share sheet with summary + deep link `mobilefrontend://activity/<id>` (feed card, detail) and profile link; private activities have no Share button | BUILD-VERIFIED (deep link not opened on a device) |
| Activity detail + map | Raw track to the owner only | Map, stats, splits, elevation, kudos bar, comments, owner menu (Edit, Delete) | VERIFIED (auto) API · BUILD-VERIFIED UI |
| Activity history | `GET /athletes/:id/activities` (cursor, policy) | History screen with infinite scroll; reachable from profile ("See all"), Workout tab and Maps | VERIFIED (auto) |
| Notifications | Follow, kudos and comment create notifications (de-duplicated by "new row only") | Existing notifications screen | VERIFIED (HTTP E2E: owner receives FOLLOW, KUDOS, COMMENT) |

Kudos removal deliberately departs from real Strava ("no takebacks"), because you asked for it.

## 2. Phase 5 summary: QA

Approach: re-read the code paths, add tests where none existed, and fix what was found. Bugs found and fixed in **this** pass:

| # | Bug (root cause) | Fix |
|---|---|---|
| B1 | **Home feed stale.** Data was fetched only on first mount and on pull-to-refresh; returning after saving, following or commenting showed old data. | Focus refetch (throttled 10 s), reload when an upload finishes, server data re-seeds social state. |
| B2 | **Refresh could append a stale page.** A "load more" in flight during a refresh appended an old page to the fresh list (duplicates or wrong order). | Generation counter: late pages are discarded. |
| B3 | **Possible HTTP caching of personal data.** | Server sends `Cache-Control: no-store` on every API response; client fetch uses `cache: 'no-store'`. |
| B4 | Feed cards were keyed by `id:kudos:comments`, so every count change remounted the card and lost its state. | Key by id; counts come from the shared social store. |
| B5 | Feed `hasKudos` was hard-coded `false`; the kudos button was hidden on your own activities, so "only comments" showed for most of your feed. | Real `EXISTS` subquery; kudos action on every card (own activity → who gave kudos). |
| B6 | Followers/Following screens showed **search results**, not followers. | Rebuilt on the new endpoints. |
| B7 | Create Club / Challenge / Event screens **did not send anything**: Save just closed the screen. No `POST /events` existed. | All three now submit to the API (validated); `POST /events` added with zod validation; the creator auto-RSVPs. |
| B8 | Groups tab had a hard-coded "November Elevation Challenge" whose Join only changed local state. | Removed; the tab shows only server data, with real joins and RSVPs (optimistic + rollback). |
| B9 | Events list: `attendeesCount` defaulted to **1** for events with no RSVPs; the viewer's `rsvpStatus` was always null. | Real count; the viewer's RSVP is returned. |
| B10 | Maps tab: invented surface percentages, every route "by Md Rakib Ali", decorative heatmap/terrain toggles, old map wrapper. | Rebuilt on the working MapLibre v11 `MapView` (§8). |
| B11 | Feed/profile route previews were an orange line on a grid with no geography. | Real basemap tiles under the route (§8). |
| B12 | Fabricated fallbacks: club city "Dhaka", onboarding pre-filled with a real person's name. | Removed. |
| B13 | `Header.tsx` (unused) linked to `/manual-entry` and `/post/create`, which don't exist. | Dead component removed; a navigation test now fails on any broken route. |
| B14 | Login effect referenced a handler declared after it (lint) and an unescaped apostrophe on the event screen. | Fixed. |

## 3. All implemented features (Phases 3–5)

Recording engine (shared metrics, filter, lifecycle) · foreground-service background location · SQLite persistence and interruption recovery · offline-first batch sync (idempotent, retry with backoff, network/foreground triggers) · activity save, edit, delete, history, detail map · visibility policy · auth hardening · social features in §1 · five-tab navigation · Workout tab · rebuilt Groups (challenges, clubs, events + create) · rebuilt Maps · tile-backed route previews · Recording & GPS settings screen (permission state, notification permission, battery-optimization shortcut).

## 4. Fixed bugs

Phase 3 fixes are listed in [STRAVA_TECHNICAL_AUDIT.md §13](STRAVA_TECHNICAL_AUDIT.md#13-status-updates) (GPS-01…11, SYNC-02…08, SEC-02/04/05/06, PRIV-01…06, API-01/03/05/08). Phase 4–5 fixes: B1–B14 above.

## 5. UI/UX changes (reference: `mobile-frontend/strava-screen/*`)

| Screen | Reference | Change |
|---|---|---|
| Bottom bar | home-tab.png | Five tabs with the active icon in an orange-tinted pill. |
| Home | home-tab.png | App name header with **+ (record) · messages · search · notifications**. Cards: athlete row → bold title → description → Distance / Pace / Time → **large map** → "N gave kudos · N comments" → **Kudos · Comment · Share** icon bar. |
| Activity detail | home-feed-details.png | Map on top, stats sheet, then a kudos/comments summary with a **Give kudos / Share** action bar; comment menu (edit/delete); owner menu (edit/delete). |
| Workout | workout-tab.png | Card per sport with an orange **Start** button. Active-recording and pending-upload cards. Activity history button. |
| Recorder | run-screen*.png, walk-screen.png | Already matched (map, floating stats card, Pause → Resume/Finish). Paused strip now reads **"Stopped"** like the reference. |
| Save | save-activity.png | **Black** Save button as in the reference. Photos, tags and private notes are *not* shown because the backend can't store them (no fake controls). |
| Maps | maps-tab.png | Full-screen map, search bar, chips (Routes / Saved / My activities / sports), locate, **Create Route**, bottom route-card carousel. |
| Groups | group-tap.png | Title + messages/search/create; **Challenges · Clubs · Events** underline tabs; sport chips; cards with Join / RSVP. |
| You | profile-tab.png | **+ · search · settings**; name, *N activities*, tappable followers/following, Edit/Share profile, Progress (this week, 12 weeks, this year, all time) and Activities tabs. |

## 6. Bottom navigation

Before: Home · Record · You (Maps and Groups hidden behind flags). Now: **Home · Maps · Workout · Groups · You** (`src/app/(tabs)/_layout.tsx`). Feature flags now default **on** (`EXPO_PUBLIC_FEATURE_*=false` turns a module off). The old `record-tab` route still exists for old deep links and forwards to the recorder. A test asserts the five tabs, in this order.

## 7. Home and feed improvements

See B1–B5. Pull-to-refresh also triggers the upload worker. Pagination uses a server row-value cursor, so equal timestamps don't skip or repeat. A server test shows that an activity inserted between page loads doesn't duplicate across pages and appears first on refresh.

## 8. Map improvements

Provider is now **MapLibre Native v11 + OpenFreeMap** (no API key). Details and verification are in §19.

- **List previews** (feed, profile, history, save, events; `RoutePreview.tsx` + `routeSnapshot.ts`): a native MapLibre **snapshot** of the OpenFreeMap *Positron* style, with the route (white casing + orange line) and start/finish markers drawn **inside the map style**, so they sit exactly on the streets. The camera fits the route with padding (fractional zoom, max 16; `fitCamera` is unit-tested). Snapshots are cached and rendered at most two at a time, and an attribution label is shown. If a snapshot can't be produced (offline, Expo Go), the route geometry is drawn on a neutral background labelled "Map unavailable — route only", never a fake map. CARTO raster tiles were removed (their free terms are non-commercial).
- **Interactive map** (`MapView`, OpenFreeMap *Liberty*: parks, water, paths, POIs). Additions:
  - point markers with tap-to-select;
  - map tap (route builder);
  - `focus` camera;
  - a load-error overlay with Retry;
  - native attribution.

  The camera never invents a position: with no route and no known location it shows the world. In Expo Go it says the map needs the development build, instead of the old Leaflet fallback with a hard-coded Dhaka centre (removed).
- **Legacy map screens** (route detail, navigation, builder, heatmap, segments) now go through `StravaMapView`, rebuilt as an adapter over the same working map. Every hard-coded Dhaka default coordinate was removed.
- **Route builder:** now tap-to-draw from your real location, with distance computed from the points by the server. The old version drew a geometric circle around Dhaka and invented climb, surface and elevation.
- **Maps tab:** Nearby (real places, §19B) · Routes · Saved · My activities, plus markers ↔ card carousel, Directions, Start activity, and Create Route.
- **NOT DEVICE TESTED:** on-screen rendering, snapshot output, gestures, camera re-framing, the user dot.

## 9. Kudos implementation

Endpoints: `PUT|POST /activities/:id/kudos` (give), `DELETE` (remove), `GET` (list). Guarantees, each covered by a test: idempotent (5 concurrent gives → 1), unique `(activity_id, athlete_id)`, no self-kudos (422), visibility enforced on give/remove/list (404), notification only on a new kudos. App: `lib/social.ts` `setKudos()` updates optimistically, reconciles with the server count and rolls back on error.

## 10. Backend changes

Hono app factory with per-request DB · zod validation · typed `HttpError` · `lib/policy.ts` · `lib/dto.ts` public DTOs · batch upload service · activity PATCH/DELETE/history · social service (follow, lists, stats) · kudos/comments endpoints · `POST /events` · events RSVP data fix · `no-store` header · JWT fail-closed · mock Google tokens removed · **demo login removed entirely** · `GET /places/nearby` (Photon + Overpass failover, cached, privacy-rounded) · route creation computes distance server-side (no invented defaults) · Google token verification injectable for tests · seed scripts and the destructive `clean-seed-data.js` deleted · all modules still mounted (none removed) · local dev server `npm run dev:local` (PGlite) · E2E script `scripts/e2e-local.mjs` (refuses production URLs).

## 11. Database changes and migrations (additive only; nothing dropped or renamed)

| Migration | Contents |
|---|---|
| `0002_batch_uploads.sql` | `activity_uploads`, `activity_upload_batches`, `activities.client_activity_id` + unique `(athlete_id, client_activity_id)`, index `(athlete_id, start_time)` |
| `0003_social.sql` | `comments.updated_at`; indexes `comments(activity_id, created_at)`, `follows(following_id, created_at)`, `kudos(athlete_id)`, `notifications(recipient_id, created_at)` |

Migration test: every backend test run applies `0000…0003` in order to a fresh PGlite database. **Not run against Neon.** The production database was originally created by `scripts/migrate.js`, so check that its schema matches `0001` before applying these.

**Database choice:** the briefs mention Cloudflare D1, but the deployed system and the Phase 1 ADR use **Neon Postgres via Hyperdrive**. This work stayed on Neon; moving to D1 needs your decision (see §16).

## 12. Automated test results (this session, final run)

| Suite | Result |
|---|---|
| Backend TypeScript (`tsc --noEmit`) | ✅ 0 errors |
| Backend + shared (Vitest, PGlite with real migrations): shared tracking 31, api 22, social 11, groups 5, places 10, routing+place details 10, google-auth 3 | ✅ **92 / 92** |
| HTTP E2E (`scripts/e2e-local.mjs`, three users, local server, **real** Photon, Valhalla, OSM API, Wikidata and Commons) | ✅ **31 / 31** |
| Live provider check: real places for Run/Walk/Hike/Ride in Dhaka, Chattogram and Sylhet (§19B) | ✅ real results in all 12 cases |
| Map style check: the exact style the app builds (OpenFreeMap Positron/Liberty + injected route/marker layers) against MapLibre's official `validateStyleMin` | ✅ valid (59 / 115 layers) |
| App TypeScript | ✅ 0 errors |
| App Jest: format, calories, activityView, social store, mercator (incl. `fitCamera`), sync worker, API client errors, navigation integrity, planned-vs-recorded separation | ✅ **51 / 51** |
| App ESLint (`eslint src`) | ⚠️ 5 errors, 7 warnings, **all pre-existing** in files whose logic wasn't changed (React Compiler `set-state-in-effect` in analytics/goals, messages ×2, routes/[id], use-color-scheme.web). **0 problems in every file added or changed in this work.** |

Tests that were updated to the new behaviour (not hidden): `activityView.test` (feed `hasKudos` is now real), `social.test` (toggle → idempotent give/remove).

## 13. Build results

| Build | Result |
|---|---|
| Cloudflare Worker (`wrangler deploy --dry-run`) | ✅ 968.0 KiB / gzip 186.7 KiB |
| Android JS bundle (`expo export --platform android`) | ✅ Hermes bundle 5.8 MB |
| Android debug APK (incremental rebuild after this round, `nice`-d while your Metro ran) | ✅ `BUILD SUCCESSFUL in 26s` (no native changes since the Phase 3 build) |
| Android release APK (`assembleRelease`, arm64, built **before** this round's changes; no new native modules since, so a rebuild needs no native changes) | ✅ `BUILD SUCCESSFUL in 20m 25s` → `android/app/build/outputs/apk/release/app-release.apk` (54.5 MB) |

### 13a. Release build notes
- Signed with the **debug keystore** (Expo prebuild default). It is not a Play Store build; use EAS or your own keystore for that.
- Its JS was bundled **without** `EXPO_PUBLIC_API_URL`, so it talks to the **production** Worker, which doesn't have the new endpoints until you deploy. For testing before deployment, use the development-build route in §18 (local backend).
- Not installed on any device (no device connected).

## 14. Security findings

| ID | Severity | Status |
|---|---|---|
| SEC-01 Neon password in git history | **Critical** | Removed from the working tree (`drizzle.config.ts`, `scripts/*` read `DATABASE_URL`; `.dev.vars` untracked). **Rotate the password**: history still contains it. |
| SEC-02 mock Google tokens / demo login | Critical | Fixed (tested). |
| SEC-03 SHA-256 password hashing with a static salt | **High** | **Open.** Move to PBKDF2/scrypt after checking the Workers CPU budget; rehash on login. |
| SEC-04 JWT fallback secret | Critical | Fixed; **set `JWT_SECRET` (≥ 32 chars) before deploying** or auth returns 500. |
| SEC-05/06 Google linking / audience | High | Fixed. |
| SEC-07 Out-of-scope modules' own authorization | Medium | **Open.** Kept mounted at your request. Clubs/challenges/events/routes/messages/segments/goals/beacon have not been through the policy review the activity APIs got. |
| SEC-08 Token in AsyncStorage | Medium | Open (move to expo-secure-store). |
| SEC-09 CORS `*` | Low | Open (native app; set `CORS_ORIGIN` if a web client is added). |
| PRIV-01…06 | Critical/High | Fixed (visibility matrix tests). |
| PRIV-05 search lists all users on an empty query | Low | Open. |
| PRIV-07 privacy zones drop points only; no hide-start/end | Medium | Open. |

## 15. Remaining issues (by severity)

| Severity | Issue |
|---|---|
| **High** | Google Sign-In can't work until the Android OAuth client (package + SHA-1) is registered (§19C), and it has not been verified on a device. |
| Medium | Nearby places depend on free fair-use services (Photon primary, Overpass failover). Fine at small scale with the 24 h cache; for growth, self-host Photon/Overpass or use a paid places API. |
| Medium | Package name is still the placeholder `com.anonymous.mobilefrontend`. |
| Low | Possible seed/demo rows already in the production database (no access from here; inspect manually, §19D). |
| **Critical** | Backend not deployed and migrations 0002/0003 not applied. Until then the app uses the legacy upload fallback, and **kudos removal, follower lists, stats, comment edit/delete, history and event creation return 404 in production**. |
| **Critical** | Rotate the Neon password (SEC-01). |
| High | No on-device verification of anything in this report (§17). |
| High | GPS filter thresholds tuned only on synthetic tracks; real-world accuracy (plan protocols T-1/T-2) not measured. |
| High | SEC-03 password hashing. |
| Medium | Older secondary screens (club/challenge/event/route detail, messages, route builder, notifications, onboarding, analytics) still use the previous NativeWind styling. They work but aren't restyled to the new design system. |
| Medium | No auto-pause setting; no audio cues; no hide-start/end privacy distance. |
| Medium | Profile/Workout stats are UTC weeks (a Monday 02:00 local activity in UTC+6 counts in the previous week). |
| Medium | Clubs/challenges/events lists aren't paginated (fine at the current data size). |
| Low | 8 React Compiler lint errors in untouched legacy files; follow is still also exposed as a legacy toggle for old app builds. |
| Low | Sharing uses an app deep link; there's no public web page for an activity yet. |

## 16. Not implemented, and why

| Item | Why |
|---|---|
| Move to Cloudflare D1 | The deployed system and your Phase 1 confirmation are Neon Postgres. Migrating the database and all queries is a separate project that needs your decision. |
| Photos/videos, activity tags, "how did it feel", private notes (Save screen in the reference) | No backend storage yet (photos need R2). Not shown rather than faked. |
| Notification preferences, blocked athletes, data export, GPX import screens | The existing screens were local-only toggles or `setTimeout` fakes. They stay in the codebase but are not linked. "Recording & GPS" was rebuilt as a real screen and is linked. |
| Heatmaps, 3D, terrain layers (Maps) | No data source; the old toggles were decorative. |
| Segments, PRs, Premium/"Start your free trial" | Out of MVP scope. |
| Push notifications | In-app list only; no push service configured. |

## 17. Requires physical-device testing: NOT DEVICE TESTED

Also: OpenFreeMap map rendering and route snapshots on screen, nearby places from the phone's real GPS fix, the Directions intent, and the Google Sign-In account chooser and token round trip.

GPS permission prompts on Android 17 · real GPS accuracy and drift · live route drawing · **screen-off recording** · **app backgrounded** · **app swiped away** · **force-stop → interrupted-recording recovery** · reboot recovery · temporary GPS loss ("GPS SIGNAL LOST") · airplane mode during save → automatic upload when back online · foreground-service notification · battery-optimization shortcut · map tiles and MapLibre on device · share sheet and deep link · all screen layouts on a 6.1" display.

## 18. A-to-Z test plan for you

### Setup (once)
1. **Backend (production), only when you're ready:**
   1. `cd mobile-backend`
   2. `wrangler secret put JWT_SECRET` (random, ≥ 32 characters). This logs everyone out.
   3. Apply the migrations: `DATABASE_URL=… npx drizzle-kit migrate`, or run `drizzle/0002_batch_uploads.sql` then `0003_social.sql`.
   4. `npm run deploy`.
2. **Or test safely without touching production:**
   1. `cd mobile-backend && npm run dev:local` (local database).
   2. `adb reverse tcp:8787 tcp:8787`.
   3. Start Metro with `EXPO_PUBLIC_API_URL=http://localhost:8787/api/v1 npx expo start`.
3. **App:** with the Pixel connected, run `cd mobile-frontend && npx expo run:android`. A development build is required; Expo Go can't run background location.
4. Create **two accounts** (A on the phone; B on a second phone, or via the API) for the social tests.

### A. Navigation
5. The bottom bar shows **Home · Maps · Workout · Groups · You**; each opens, and the active tab has an orange icon in a pill.
6. Home header **+** opens the recorder, plus Messages, Search and Notifications. The You header shows +, search and settings.

### B. Recording (do outdoors)
7. On Workout, tap **Start Run**. The recorder opens with Run selected and the strip goes from "Acquiring GPS…" to "GPS ready". Tap Start and allow location and notifications.
8. Walk or run about 5 minutes. Check that time ticks, distance grows, pace appears, the orange line follows you, and an Android notification says "Recording run".
9. **Lock the screen for 3–5 minutes** while moving, then unlock. Distance and the line should cover the locked period.
10. Tap **Pause**: the strip shows "Stopped" and time freezes. Walk 50 m, then **Resume**: no straight jump line, and distance doesn't include the paused walk.
11. Press Home (app in the background) and walk a minute, then reopen the app. Recording continues; the Workout and Home banners show it.
12. **Kill test:** during a recording, Settings → Apps → *app* → **Force stop**. Reopen the app: Home shows "Recording interrupted · Resume or finish", and the recorder lets you Resume (the line continues) or Finish.
13. Repeat 7–8 for **Walk, Hike, Ride**. Ride shows speed (km/h) instead of pace.

### C. Save, offline and sync
14. **Finish** opens the Save screen: summary, map preview, default title. Change the title, sport and **Who can view** to *Followers*, then **Save Activity** (black button). The new activity's detail opens.
15. **Offline save:** record a short activity, turn on **airplane mode**, then Save. The alert says "Saved on this phone…" and Home shows "… waiting to upload". Turn airplane mode off. Within a few seconds, or after tapping Retry, the banner disappears and the activity appears in the feed **once**.
16. Double-tap Save quickly on another recording: there should be exactly one activity.

### D. Activity management
17. Open your activity, then **⋮ → Edit activity**: change the title, sport and visibility, then save. The detail updates.
18. **⋮ → Delete activity**: it disappears from Home, profile and history.
19. You → Activities → **See all activities** (or Workout → Activity history): infinite scroll, pull to refresh.

### E. Social (two accounts)
20. B searches for A and taps **Follow**. A's follower count goes up; A gets a "started following you" notification.
21. B's Home shows A's **Everyone** and **Followers** activities, but **not** "Only you" ones. Pull to refresh shows new ones.
22. B taps 👍 on A's card: it turns orange and the count goes up. Tap again to **remove**. A's own card shows the 👍 action, which opens **who gave kudos**.
23. B comments, then **edits** via "…" ("(edited)" appears) and **deletes** it. A can delete B's comment on A's activity; B can't edit A's comments.
24. Followers/Following screens open from the profile counts, with Follow buttons per row.
25. **Share** (feed card or detail) opens the Android share sheet with a summary and link. A private activity has no Share.
26. B unfollows A: A's Followers activities disappear from B's feed, and opening one by link shows "isn't available".

### F. Maps and nearby places
27a. Open Maps: **Nearby** is selected. Allow location; within a few seconds real parks, tracks or trails near you appear as orange markers and cards ("© OpenStreetMap contributors"). Switch Run/Walk/Hike/Ride. Tap a marker → its card is selected; **Directions** opens your maps app; **Start Run** opens the recorder.
27b. Deny location (Settings → Apps → Location → Don't allow) and reopen Maps: you see "Location needed for nearby places" — **no** places, no default city. Turn on airplane mode → "Nearby places unavailable" + Retry — **no** fallback list.
27c. Workout tab → **Places near you** shows the three nearest for the chosen sport; tapping one opens it on Maps.
27. Maps shows the map at your location (blue dot) with route cards along the bottom. Swipe the cards: the map frames each route. Use the chips for Routes / Saved / My activities / sports, search by name, bookmark to save, and **Create Route** opens the builder.
28. Feed cards show a **real street map** with the orange route, a green start and a black finish.

### F2. Google Sign-In (after completing §19C setup)
28a. Log out (also signs you out of Google). Tap **Continue with Google** → the account chooser appears → pick an account → you land on Home. Kill and reopen the app → still signed in.
28b. Tap Google, then press Back on the chooser → nothing happens (no error).
28c. A brand-new Google account starts with an empty feed, 0 activities, 0 followers, no city/bio/photo invented.

### G. Groups
29. Groups → Challenges / Clubs / Events tabs with sport chips. Tap **+** to create one of each; it opens the new item.
30. **Join** a challenge (the progress bar appears), **Join** a club (member count +1), **RSVP** an event ("Going ✓", count +1). Pull to refresh keeps the state.

### H. Profile and settings
31. You: activity count, Progress (this week, 12 weeks, this year, all time, sport chips), Activities tab, **Share profile**, Edit profile.
32. Settings → **Recording & GPS**: green or red status for location, device location and notifications, with fix buttons, plus **Open battery settings**.
33. Privacy zones: add a zone at your location; activities recorded inside it hide that part from others.

Report anything that fails with the step number. Steps 7–16, 27–28 and 32 are the ones I could not verify without your phone.


---

## 19. Map provider, nearby places, Google Sign-In, no demo data

### A. Map provider: MapLibre Native + OpenFreeMap

| Question | Finding |
|---|---|
| Current library | `@maplibre/maplibre-react-native` **11.5.1** (MapLibre Native), already a dependency with its Expo config plugin, Expo SDK 58 / RN 0.88, new architecture. Already in the Android dev build. **No migration of the map library was needed.** |
| Previous tile provider | CARTO basemaps (no key, but free use is limited to non-commercial). Replaced. |
| OpenFreeMap | `https://tiles.openfreemap.org/styles/{liberty,positron,bright}`: no key, no registration. Verified from this machine: styles 200 OK; **Dhaka z14 vector tile 305 KB** of real OSM data. Attribution "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (shown by MapLibre's attribution button and on every snapshot). |
| Style choice | **Liberty** for interactive maps (parks, water, paths, POIs give geographic context). **Positron** for small previews, so the orange route stands out. Override with `EXPO_PUBLIC_MAP_STYLE_URL`. |
| Compatibility | Background tracking, GPS and the recorder are untouched (separate modules). No new native dependency, so the existing dev build works. Route polylines, markers, gestures and the camera use only v11 APIs (`Map`, `Camera`, `GeoJSONSource`+`Layer`, `UserLocation`, `StaticMapImageManager`). |
| Verification done | Type-checked. The exact styles the app builds pass MapLibre's official style validator. Projection/fit maths unit-tested. A headless native render was attempted, but the environment blocked loading the required native libraries, so **no rendered image was inspected**. |
| **NOT DEVICE TESTED** | Visual rendering, snapshot output, gestures, user dot accuracy. |

### B. Real nearby workout places

| Item | Implementation |
|---|---|
| Endpoint | `GET /places/nearby?lat&lng&sport&radius` (auth required; radius 0.5–15 km; default 5 km). |
| Data | OpenStreetMap only. Categories: park, garden, nature reserve/forest, running track, recreation ground, cycleway, cycling/hiking routes. |
| Provider 1 (primary) | **Photon** (komoot) reverse search with OSM tag filters: free, no key, fair use. Two parallel queries per request (sport-specific + general green space), so dense park areas can't crowd out tracks or cycleways (4 reserved slots). Tiny areas (< 150 m; gardens < 300 m) are dropped. Results are de-duplicated and sorted nearest first. |
| Provider 2 (failover) | **Overpass API** (two public instances): adds path geometry and length. Observed at capacity (502) or unreachable during development, so it isn't primary. |
| Not used | OpenFreeMap (tiles only); Nominatim (search needs a text query, and its usage policy forbids app-scale use); Geoapify/Google Places (API key and paid tiers not needed). |
| Privacy | The client sends its real fix to **our** API only. The server rounds it to 3 decimals (~110 m) before calling a provider, and providers see the Worker, not the phone. |
| Caching / limits | 24 h per (rounded cell, sport, radius) in the Workers Cache API (in-memory in Node dev). `User-Agent` identifies the app. |
| Failure | Provider failure → **503 + Retry** in the app. Nothing found → empty state. **There is no static or fallback list anywhere.** |
| Live verification (real provider, this machine) | Dhaka/Shahbag: Shishu Park 147 m, Ramna Park 294–359 m, Suhrawardy Udyan 490 m … Lalmatia Running Track 3.5 km (Run), Baldha Garden (Hike), Mohammadpur cycleway (Ride). Chattogram: Biplob Udyan, Shishu Park, DC Hill. Sylhet: 3 parks within 5 km. |
| App | Maps tab **Nearby** (default): markers, card carousel, Directions (`geo:` intent → your maps app), **Start {sport}**. Workout tab **Places near you** (top 3). States: locating, permission denied (with Allow/Settings), location off, no GPS fix, loading, error + Retry, empty. |
| **NOT DEVICE TESTED** | Real phone GPS fix, the permission prompts, the `geo:` intent. |

### C. Google Sign-In

**Implementation (reviewed and fixed):**
- **App:** native `@react-native-google-signin/google-signin` v17 (Google Play Services), with `webClientId` = the *web* OAuth client and `offlineAccess: false`.
- **Fixes:**
  - Cancelling (`{type: 'cancelled'}` in v17) used to show an error.
  - The Expo Go browser fallback was removed, because Google doesn't support that flow for this setup. Expo Go now shows an honest message.
  - "DEVELOPER_ERROR" (status 10) now explains the configuration problem.
  - Logout now also signs out of Google.
- **Backend `POST /auth/google`:** verifies the ID token with Google's JWKS (RS256 signature, issuer `accounts.google.com`, **audience = `GOOGLE_CLIENT_ID`**, expiry). It finds or creates the athlete; linking to an existing email account only happens when `email_verified` is true. It issues our own JWT (requires `JWT_SECRET`; no fallback secret). No mock tokens, no demo login.
- **Tests:** 3 tests with real RS256-signed tokens and a local key set: valid passes; wrong audience, wrong issuer, expired, forged signature, missing client ID and mock token fail; unverified email is reported. Google's live JWKS endpoint was reachable from here (2 RS256 keys).
- **NOT VERIFIED:** the real end-to-end OAuth flow on a phone. It needs your Google Cloud configuration and a device.

**Google Cloud Console setup (must be done by you, in the project that owns web client `923419495380-p8sen….apps.googleusercontent.com`):**
1. **OAuth consent screen:** app name, support email, scopes `email`, `profile`, `openid`. While it's in "Testing", add your Google accounts as test users.
2. **Web application** OAuth client. This already exists and is set in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app) and `GOOGLE_CLIENT_ID` (`wrangler.jsonc`), and the two must match.
3. Create an **Android** OAuth client:
   - Package name: **`com.anonymous.mobilefrontend`** (the current `app.json` value).
   - SHA-1 for local dev/debug builds (standard React Native debug keystore, `android/app/debug.keystore`): `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. SHA-256 for reference: `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`.
   - Add **another** Android client (or SHA-1) for every other signing key: your release keystore, the EAS credentials (`eas credentials`), and the Play App Signing key from Play Console → App integrity.
4. **Before release:** change `android.package` to your real ID (e.g. `com.<company>.<app>`). That needs a **new** Android OAuth client, and the debug key above is shared by every React Native template project, so never use it for release.
5. No `google-services.json` is needed for this library's sign-in.

### D. No demo users, seed data or invented content: audit results

| Removed / fixed | Where |
|---|---|
| Demo login (endpoint, service, app context `loginAsGuest`/`loginWithDemo`, API client) | backend + app |
| Seed scripts `seed.js`, `seed-routes.js`; **destructive** `clean-seed-data.js` (deleted every user's activities except one hard-coded ID) | `mobile-backend/scripts` |
| Unused mock data file and dead components with invented content (`mock/data.ts`, `AthleteIntelligenceCard`, `MatchedSegmentsSection`, `ActivityCard`) | app |
| Default "Dhaka, Bangladesh" + stock photo + "Open Strava Runner" bio for every login, notification and signed-out state | `AppContext` |
| Stock-photo avatars and badges standing in for real people | segment, messages, club, members, suggested, challenge |
| Club list invented weekly stats (42 km / 8 activities) and challenge `daysRemaining` default 10 | `AppContext` mappers |
| Event detail placeholder event ("City Striders", 12 attendees, 5:30 pace, RSVP "Going"), fake "Official Group Route" → `route_1` | event screen rebuilt on the API |
| Route detail fallback with invented elevation profile and 95% paved surface; backend route defaults (5 km / 25 m / surface split / profile) | route screen + backend |
| Route builder pre-filled Dhaka loop and invented climb | rebuilt |
| `RouteMapPreview` invented loop when an event had no route | now renders nothing |
| Analytics screens with hard-coded sample data (training log, relative effort, fitness & freshness, race predictions, training plans, matched activities) and the segment screen's invented KOM / "Local Legend" | replaced by an honest "not available yet" screen (routes kept) |
| Login placeholder containing a real person's name | "Your name" |
| New accounts | Test-verified: no invented city, bio, photo, physiology; empty feed, history, stats, notifications, followers |

**Remaining decorative asset:** the onboarding welcome screen's hero photo (an Unsplash stock image used as a design background, not presented as anyone's data).

**Production database:** I have no access to it. If seed or demo rows were inserted earlier (by the deleted scripts), they are still there. Inspect with SQL and delete them deliberately; there's no longer a script that does this blindly.

**Test fixtures:** synthetic tracks and provider responses exist **only** in `__tests__` files and the local PGlite test database. They are never in the app bundle or any real database.


---

## 20. Final round: maps discovery, real routing, workout integration (2026-11-20)

### 20.1 Phase 4 (social): re-verified, not rebuilt
Already implemented and tested in §1. Re-run this round: 22 API + 11 social tests, plus E2E (follow → feed → kudos give/remove/list → comment add/edit/delete → notifications → unfollow → privacy → edit/delete). New this round: social list screens (kudos, followers/following, history) show the server's real error, e.g. "needs the latest server version", instead of a generic failure.
**Not supported (documented, not faked):**
- private *profiles* (only per-activity visibility exists);
- uploading a profile photo (no image storage yet; Google profile photos are shown).

### 20.2 Maps discovery
Full-screen OpenFreeMap map (MapLibre v11) with your real location dot; zoom and pan; sources **Nearby / Routes / Saved / My activities**; sport chips; filter-by-name; a marker ↔ card carousel. The selected place card shows:
- category, distance from you, address and path length (when the provider has them);
- a **genuine photo** (§20.3);
- **Route** (opens the preview), **Directions** (your maps app) and **Start**.

The **map style** button switches modes without moving the map (§20.5). No hard-coded location anywhere: no permission → permission state; no fix → "Couldn't get a GPS fix"; provider down → error + Retry.

### 20.3 Data providers and genuine images

| Need | Provider | Key? | Notes |
|---|---|---|---|
| Map tiles | OpenFreeMap (OSM / OpenMapTiles) | No | Liberty, Positron, Bright |
| Nearby places | Photon (komoot) reverse + OSM tags; Overpass failover | No | §19B |
| Place details | OpenStreetMap API 0.6 (`/node|way|relation/{id}.json`) | No | Only for the *selected* place; cached 7 days |
| Place photos | OSM `wikidata` → Wikidata P18 → **Wikimedia Commons**; or OSM `wikimedia_commons` File/Category | No | Only media the OSM object itself links to. Author, licence and Commons page are shown under the photo. Verified: Ramna Park → "Romna Park5.JPG", Hameem Shakhawat, CC BY-SA 3.0. Places without linked media show **no photo** (e.g. Suhrawardy Udyan). |
| Routing | Valhalla, FOSSGIS public instance | No | §20.4 |
| Elevation | Valhalla `/height` (DEM) | No | §20.4 |

All of these are free, fair-use public services, cached on our side. For production scale, self-host Valhalla/Photon or move to paid tiers.

### 20.4 Routing engine and route geometry
`POST /routing/plan {sport, from, to}`, from your **real** position to the selected place:
- **Engine:** Valhalla costing — pedestrian for Run/Walk (walking speed 10 / 5 km/h), pedestrian with hiking difficulty for Hike (4 km/h), bicycle for Ride (18 km/h).
- **Alternatives:** up to 2.
- **Geometry:** decoded from Valhalla's polyline6, so it is continuous and follows mapped ways (verified live: 1.32 / 1.44 / 1.77 km options between Shahbag and Ramna, 46–71 vertices; the longest vertex gap, 118 m, is a straight road stretch between junctions).
- **Distance and duration:** Valhalla's, labelled with the assumed speed.
- **Elevation:** DEM samples every 30 m, gain/loss with 5 m hysteresis (DEM noise). `null` if the DEM call fails. Labelled "terrain model (estimate)".
- **Errors:** "no path" → 422 message; outage → 503 + Retry.
- **Nothing drawn as straight lines between coordinates; no invented numbers.**

**Route preview** (`/routes/plan`):
- map auto-fit to the selected route, alternatives faint, destination marker, your dot;
- alternative chips, distance, est. time and elevation gain, elevation profile;
- **Start {sport} with this route**, **Start without route**, **Save route** (stores the real geometry; the server recomputes distance);
- attribution.

**Loop routes:** not offered. Valhalla plans A→B only, and a fabricated loop isn't acceptable.

**Route builder** (Create Route): tap-to-draw, labelled "straight segments between taps". It's a manual drawing tool, not presented as routed geometry.

### 20.5 Map styles: real availability
| Mode | Source | Offered |
|---|---|---|
| Standard (2D) | OpenFreeMap Liberty | ✅ |
| Light | OpenFreeMap Positron | ✅ |
| Bright | OpenFreeMap Bright | ✅ |
| 3D buildings | Liberty's `building-3d` layer (OSM building heights) + camera tilt 55° | ✅ (the layer exists in the style; how it looks on device is NOT DEVICE TESTED) |
| Satellite | none configured | ❌ not shown |
| Terrain / topo / hillshade | no raster-dem or hillshade source in these styles | ❌ not shown |

Switching keeps the camera: the Map isn't remounted, and tilt uses `camera.easeTo`.

### 20.6 Workout
- **Sports:** Run, Walk, Ride, Hike (Workout tab cards; Maps → Start).
- **Live recording:** your GPS dot; the **recorded** route (orange, from the Phase 3 engine); time and distance; pace or speed; and in the large-stats view **moving time**, **current pace/speed**, elevation gain (only when reliable) and calories (estimate). Pause, Resume and Finish are unchanged.
- **Phase 3 engine:** untouched (no second engine). A test asserts that `tracking/engine.ts`, `locationTask.ts`, `sync.ts` and `db.ts` never reference the planned route.

### 20.7 Planned vs recorded routes
- A planned route lives in a separate in-memory store (`lib/plannedRoute.ts`). On the recorder it's drawn as a **dashed blue** reference line, with a chip showing its name, distance and time and a ✕ to hide it.
- The recorded track is the **solid orange** line from GPS points.
- Saving builds the activity **only** from recorded points (sync/upload path unchanged). The planned route is cleared on save or discard.

### 20.8 Five-tab navigation
Home · Maps · Workout · Groups · You, asserted by `navigation.test.ts`, which also checks that every navigation target in the code resolves to a screen, including the new `/routes/plan`.

### 20.9 Backend API changes (this round)
`GET /places/:type/:id` (details + genuine photo) · `POST /routing/plan` · addresses in `/places/nearby` results. All require auth; all are validated; provider failures → 503; never a fallback list.

### 20.10 Deployment and migrations: exact dependencies
**Order matters:** run the migrations on Neon **before** deploying this Worker version.
- The new code inserts `activities.client_activity_id` on **every** activity create (migration **0002**).
- The new code reads `comments.updated_at` in activity detail (migration **0003**).

Deploying first would break activity creation and activity detail.

| Feature | Needs deploy | Needs 0002 | Needs 0003 |
|---|---|---|---|
| Batch GPS upload (`/activities/uploads*`), idempotent create | ✅ | ✅ | — |
| Activity detail / comments list, edit, delete | ✅ | — | ✅ |
| Kudos remove / list, real `hasKudos` in feed | ✅ | — | — (indexes in 0003 help) |
| Follow PUT/DELETE, followers/following lists, stats | ✅ | — | — (indexes in 0003 help) |
| Edit/delete activity, history endpoint | ✅ | — | — |
| Nearby places, place details/photos, route planning | ✅ | — | — |
| `POST /events`, route creation without invented defaults | ✅ | — | — |
| Visibility policy, auth hardening, no demo login | ✅ | — | — |
| Maps tiles (OpenFreeMap), snapshots | app only | — | — |

**Before deploying:**
1. `wrangler secret put JWT_SECRET` (≥ 32 chars). This invalidates existing sessions.
2. `DATABASE_URL=… npx drizzle-kit migrate`, or apply `0002_batch_uploads.sql` then `0003_social.sql`.
3. `npm run deploy`.

**Until deployed**, the app against production shows "This feature needs the latest server version" for the new endpoints (tested), uploads through the legacy single-request path, and shows no fake success.

### 20.11 Security and privacy (this round)
- The user's position reaches third parties only via our server, rounded to ~110 m (places) or ~11 m (routing start). Providers see the Worker, not the phone.
- Photos are loaded from `upload.wikimedia.org` directly by the app, which does reveal the phone's IP to Wikimedia (a standard image CDN).
- No secrets added; no new API keys.

### 20.12 Known limitations (this round)
- **Medium:** public Photon/Valhalla/OSM/Wikidata endpoints are fair-use. Heavy use needs self-hosting or paid plans.
- **Medium:** Overpass failover is often at capacity (observed); when both providers are down, the app shows Retry.
- **Low:** few places in Bangladesh link a Commons photo, so most cards show no photo (by design).
- **Low:** duration estimates use fixed sport speeds, not your personal pace.
- **Low:** no turn-by-turn guidance during a workout (the planned line is a visual reference only).

### 20.13 Pixel 7a checklist for this round (NOT DEVICE TESTED; your Metro/phone session was left untouched)
1. **Maps → Nearby:** allow location. Your blue dot appears (not Dhaka unless you are there), and real places show as markers and cards. Pinch/pan the map.
2. Tap a card: if the place links a Commons photo it appears with "Photo: author · licence · Wikimedia Commons"; otherwise there's no photo.
3. **Route:** the preview opens; the orange line follows streets and paths from your dot to the place; alternatives appear as chips and faint lines; distance, est. time and elevation (or "–") are shown, plus an elevation chart when available.
4. **Map style** (layers button): Standard, Light, Bright, 3D buildings. The map stays where it was; 3D tilts and shows building blocks where OSM has heights.
5. **Start Run with this route:** the recorder shows the **dashed blue** planned line and a "Planned: … " chip. Start, walk 200 m: the **solid orange** recorded line follows *your* path. ✕ hides the planned line. The large-stats view shows Moving time and Pace now / Speed now.
6. Finish → Save. Open the activity: its map shows only what you actually recorded.
7. **Start without route** from the preview, and **Start** on a card: no planned line.
8. **Save route** on the preview → Maps → Routes shows it with the same geometry.
9. Deny location: Maps shows the permission state, never a default city or places. Airplane mode: "Nearby places unavailable" + Retry, and the route preview shows an error + Retry.
10. **Against production before deploying:** the kudos list and route planning show "needs the latest server version".
