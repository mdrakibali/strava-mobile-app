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

- **Feed / profile / history / save previews** (`components/map/RoutePreview.tsx` + `lib/mercator.ts`): the zoom is chosen so the whole route fits with padding (max z16). CARTO Voyager raster tiles (same provider as the interactive style) are cached on disk via expo-image. The route is drawn on the same Web Mercator pixel grid, with a white casing, plus a green start and black finish marker. The card map is 240 px tall (was 180). No map engine per list item. The projection and fit are unit-tested.
- **Interactive map** (`MapView`): new `otherRoutes` (faint context lines), `showUserLocation` and `frameKey` (re-frame on selection).
- **Maps tab** as in §5. Sorted nearest-first when your location is known; shows distance from you; save/unsave routes; opens route or activity detail.
- **NOT DEVICE TESTED:** tile loading on mobile data, MapLibre camera re-framing, and the user dot.

## 9. Kudos implementation

Endpoints: `PUT|POST /activities/:id/kudos` (give), `DELETE` (remove), `GET` (list). Guarantees, each covered by a test: idempotent (5 concurrent gives → 1), unique `(activity_id, athlete_id)`, no self-kudos (422), visibility enforced on give/remove/list (404), notification only on a new kudos. App: `lib/social.ts` `setKudos()` updates optimistically, reconciles with the server count and rolls back on error.

## 10. Backend changes

Hono app factory with per-request DB · zod validation · typed `HttpError` · `lib/policy.ts` · `lib/dto.ts` public DTOs · batch upload service · activity PATCH/DELETE/history · social service (follow, lists, stats) · kudos/comments endpoints · `POST /events` · events RSVP data fix · `no-store` header · JWT fail-closed · mock Google tokens removed · demo login 404 in production · all modules still mounted (none removed) · local dev server `npm run dev:local` (PGlite) · E2E script `scripts/e2e-local.mjs` (refuses production URLs).

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
| Backend + shared (Vitest, PGlite with real migrations): `shared/tracking` 31, `api` 21, `social` 11, `groups` 5 | ✅ **68 / 68** |
| HTTP E2E (`scripts/e2e-local.mjs`, two users, local server) | ✅ **23 / 23** |
| App TypeScript | ✅ 0 errors |
| App Jest: format, calories, activityView, social store, mercator, sync worker, navigation integrity | ✅ **43 / 43** |
| App ESLint (`eslint src`) | ⚠️ 8 errors, 27 warnings, **all in files not changed this phase** (React Compiler `set-state-in-effect` advisories in login, analytics/goals, messages ×2, routes/[id], StravaMapView ×2, use-color-scheme.web). 0 errors in changed files. |

Tests that were updated to the new behaviour (not hidden): `activityView.test` (feed `hasKudos` is now real), `social.test` (toggle → idempotent give/remove).

## 13. Build results

| Build | Result |
|---|---|
| Cloudflare Worker (`wrangler deploy --dry-run`) | ✅ 943.7 KiB / gzip 179.5 KiB |
| Android JS bundle (`expo export --platform android`) | ✅ Hermes bundle 6 MB |
| Android debug APK (Phase 3 native modules) | ✅ built (`android/app/build/outputs/apk/debug/app-debug.apk`) |
| Android release APK (`assembleRelease`, arm64) | ✅ `BUILD SUCCESSFUL in 20m 25s` → `android/app/build/outputs/apk/release/app-release.apk` (54.5 MB) |

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

### F. Maps
27. Maps shows the map at your location (blue dot) with route cards along the bottom. Swipe the cards: the map frames each route. Use the chips for Routes / Saved / My activities / sports, search by name, bookmark to save, and **Create Route** opens the builder.
28. Feed cards show a **real street map** with the orange route, a green start and a black finish.

### G. Groups
29. Groups → Challenges / Clubs / Events tabs with sport chips. Tap **+** to create one of each; it opens the new item.
30. **Join** a challenge (the progress bar appears), **Join** a club (member count +1), **RSVP** an event ("Going ✓", count +1). Pull to refresh keeps the state.

### H. Profile and settings
31. You: activity count, Progress (this week, 12 weeks, this year, all time, sport chips), Activities tab, **Share profile**, Edit profile.
32. Settings → **Recording & GPS**: green or red status for location, device location and notifications, with fix buttons, plus **Open battery settings**.
33. Privacy zones: add a zone at your location; activities recorded inside it hide that part from others.

Report anything that fails with the step number. Steps 7–16, 27–28 and 32 are the ones I could not verify without your phone.
