# Implementation Plan and Prioritized Roadmap

**Date:** 2026-11-19 · **Baseline commit:** `1f954d8`
**Inputs:** [Product research](STRAVA_PRODUCT_RESEARCH.md) · [Technical audit](STRAVA_TECHNICAL_AUDIT.md) · [Architecture decisions](STRAVA_ARCHITECTURE_DECISIONS.md) · [Gap analysis](STRAVA_FUNCTIONAL_GAP_ANALYSIS.md)

## Progress log
| Date | Work | Plan items affected |
|---|---|---|
| 2026-11-19 | **UI/UX redesign (frontend only)**. See [STRAVA_UI_UX_AUDIT.md](STRAVA_UI_UX_AUDIT.md) and [STRAVA_SCREEN_DESIGN_PLAN.md](STRAVA_SCREEN_DESIGN_PLAN.md) §8. Design system, redesigned MVP screens, MapLibre v11 map, ESLint + Jest set up. | **Done:** 0.4 (client sends visibility/start time/sport), 0.9 (simulation toggle no longer reachable from the recorder UI), 1.8 partially (typed errors surfaced in UI; token still in AsyncStorage), 3.1 (Save screen), 3.7 (detail screen, without TanStack Query), 3.9 (`src/lib/format.ts`), 4.3 client half (following feed, infinite scroll, SVG previews), 4.8 client half, 5.2–5.5 for MVP screens. **Still open and now more urgent:** 0.1–0.3, 0.5–0.8 (server-side privacy and auth). The recorder engine (Phase 2) is unchanged. |
| 2026-11-20 | **Phase 3: core tracking engine, local persistence, batch sync, backend hardening.** Shared `shared/tracking` (filter, metrics, lifecycle, batching) used by the app and the Worker; SQLite store; foreground-service location task; recovery; offline-first sync with idempotent batch upload; activity edit/delete/history; visibility policy; auth hardening; Vitest + PGlite API tests; local dev server (`npm run dev:local`). Details: [audit §13](STRAVA_TECHNICAL_AUDIT.md#13-status-updates), [background tracking](STRAVA_BACKGROUND_TRACKING.md). | **Done:** 0.2–0.3 (code; secret must be set), 0.5–0.7, 1.4 (shared folder; no zod contracts on the client), 1.5 (tests; no CI), 1.6, 1.7 partially (additive migration only: client id + upload tables + indexes; no UUID/enum migration), 2A, 2.1–2.4, 2.8, 2.10, 3.2–3.6 (no stats endpoint), 4.1 partially, 4.5 partially. **Not done:** 0.1 rotation, 0.8 (reverted on request), 1.2 eas.json/app identity, 1.8 secure-store, 2.5 rationale screen + battery-optimization helper, 2.7 auto-pause, 2.9 fixture replay, 3.7 TanStack Query, 4.2 hide start/end, 4.4 follower lists. **Decision needed:** D1 vs Neon (the brief says D1; the deployed system is Neon). |
| 2026-11-20 | **Phases 4–5: social features, navigation restore, Maps/Groups/Workout, QA.** Kudos give/remove/list, comment edit/delete, idempotent follow + follower lists, profile stats, sharing, five-tab navigation (Home · Maps · Workout · Groups · You), tile-backed route previews, feed refresh fixes, real create flows for clubs/challenges/events, migration 0003. Report: [STRAVA_FINAL_QA_REPORT.md](STRAVA_FINAL_QA_REPORT.md). | **Done:** 3.6 stats endpoint, 3.8, 4.1, 4.3, 4.4, 4.5 (with removal, by request), 4.6, 4.7 (de-duplicated by new-row only), 4.8 public DTO. **Changed by request:** ADR-15 (modules no longer hidden; all five tabs restored). **Open:** see the QA report §15–§17, and on-device testing (no device was connected). |
| 2026-11-20 | **Map provider, nearby places, Google Sign-In, no-demo-data audit.** MapLibre v11 + OpenFreeMap (Liberty interactive, Positron snapshots with route in-style); real nearby places `GET /places/nearby` (Photon primary, Overpass failover, cache, privacy rounding); native Google Sign-In fixes + RS256 verification tests; demo login, seed scripts and all invented fallbacks removed. See [QA report §19](STRAVA_FINAL_QA_REPORT.md). | **Done:** ADR-14 tile provider decision (OpenFreeMap), API-08 (no fabricated data), SEC-02 (demo login fully removed). **Needs you:** Google Cloud Android OAuth client (§19C), device testing. |

## 0. Strategy in one paragraph

**Do not rebuild from scratch, and do not continue on top of the current core.** Keep the platform (Expo + Router, Hono on Workers, Drizzle + Neon, MapLibre), the navigation shell, the visual components, and the backend's layered structure. **Replace** four things: the recording engine (`use-gps-recorder.ts`), the save/sync path, the activity/feed/privacy read paths on the backend, and the god-context state layer. First, ship a **Phase 0 hotfix** that closes the security and privacy holes within days, because those are live in production regardless of the rebuild. Out-of-scope modules are feature-flagged off, not deleted.

Effort figures are **rough estimates for one experienced engineer** (person-days), meant for sequencing, not commitments. They assume a physical Android device for testing.

---

## Phase 0: Stop the bleeding (security and privacy hotfix)
**Goal:** Close every Critical security or privacy issue in the *currently deployed* backend with minimal, surgical changes. **Estimate:** 2–3 days. **Prerequisite for anything else.**

| # | Task | Fixes | Notes |
|---|---|---|---|
| 0.1 | **Rotate the Neon DB password**; move all connection strings to env (`drizzle.config.ts`, `scripts/*`); git-ignore `.dev.vars`, `git rm --cached` it, add `.dev.vars.example` | SEC-01 | Rotation is the actual fix. A history purge is optional and must be coordinated with the team (force-push). |
| 0.2 | Set `JWT_SECRET` via `wrangler secret put` (new random 64 bytes); remove the literal fallback (fail closed) | SEC-04 | Invalidates all sessions (acceptable) |
| 0.3 | Remove the `demo-google-token`/`mock:` branch; mount `/auth/demo-login` only when `ENVIRONMENT !== 'production'`; require `email_verified`; require a non-empty Google audience | SEC-02, SEC-05, SEC-06 | |
| 0.4 | Client: send `visibility`, `startTime` and the selected `sport` on save | SYNC-01, SYNC-06 (partial) | ~10 lines in `AppContext.saveNewActivity` + `save-activity.tsx` |
| 0.5 | Add a minimal `canViewActivity` + visibility predicate and apply it to: detail, feed (following branch: `own OR (followed AND visibility IN (PUBLIC, FOLLOWERS_ONLY))`), profile recent activities, kudos, comments | PRIV-01, PRIV-02, PRIV-06 | Return 404 for invisible activities |
| 0.6 | GPX export: `requireAuth` + owner only + XML escaping | PRIV-04 | |
| 0.7 | Whitelist DTOs for athlete profile and search (no email, googleId, physiology, passwordHash); the profile's activity list without `rawPolyline` | PRIV-03, PRIV-05 | |
| 0.8 | Unmount the out-of-scope routers in production (goals, routes, segments, events, messages, challenges, clubs, beacon) | SEC-07, ADR-15 | Hide the matching tabs and entry points in the app |
| 0.9 | Remove the simulation toggle from release builds | GPS-09 | |

**Exit criteria:** `git grep -E "npg_|neondb_owner|open-strava-prod-secret|demo-google-token"` → empty. The old DB password fails. A visibility test script (3 users, 3 visibilities) passes against staging. Deployed.
**Testing:** A temporary scripted test (Node script or Postman collection) against staging until Phase 1 provides the proper test harness.

---

## Phase 1: Foundations
**Goal:** Make correct work possible and verifiable. **Estimate:** 5–7 days.

| # | Task | Ref |
|---|---|---|
| 1.1 | **Spike (day 1, de-risks the plan):** dev build with `expo-task-manager` + `startLocationUpdatesAsync` + foreground service writing to `expo-sqlite` from the task. Verify on 2 devices with the screen locked for 20 min, then after force-stop. Document the results in `docs/spikes/background-location.md`. | ADR-03, ADR-05 |
| 1.2 | Development builds: `expo-dev-client`, `eas.json` profiles (development / preview / production), final `android.package` + app name, fix `app.json` (remove `gradleProperties`), `expo-location` plugin with `isAndroidBackgroundLocationEnabled: true` | ADR-01, ADR-02 |
| 1.3 | Env config: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MAP_STYLE_URL`, feature flags; backend `[env.staging]` with a Neon **branch** DB | ADR-24 |
| 1.4 | `shared/` folder: `contracts/` (zod schemas for in-scope endpoints), `metrics/` (empty scaffold + sport config), wired via TS `paths` in both packages and Metro `watchFolders` | ADR-11, ADR-04 |
| 1.5 | Test harness: Vitest for `shared/` and backend (`app.request()` against Postgres in CI); `jest-expo` for the frontend; ESLint configs; GitHub Actions (typecheck, lint, test, secret scan) | ADR-23 |
| 1.6 | Backend DB middleware: one `pg.Client` per request via Hyperdrive, closed in `waitUntil`; repositories take the db from context | ADR-08 |
| 1.7 | Schema migration #1 (in-scope tables): UUID ids, `client_activity_id` + unique, `end_time`, `timezone`, `summary_polyline`, `activity_streams` table, enums, CHECKs, indexes, nullable physiology, user settings columns, `hide_from_home` rename; drop `relative_effort_score` and `gap_formatted`. Use `drizzle-kit migrate`; delete `scripts/migrate.js`. **Reset demo/seed data** (agree with the team first). | ADR-16, ADR-17, API-02 |
| 1.8 | Token → `expo-secure-store`; API client: timeout, typed errors, 401 → logout | SEC-08, FE-06 |
| 1.9 | Archive the previous agent's docs into `docs/archive/` with a note that they are superseded | §1.4 audit |

**Exit criteria:** CI green on an empty-but-wired test suite. The spike report confirms background recording on ≥ 2 devices (or documents the fallback). A dev build installs and logs in.

---

## Phase 2: Recording engine (the core of the product)
**Goal:** Accurate, crash-safe, background-capable recording for Run, Walk, Hike and Ride. **Estimate:** 10–14 days.

### 2A. Metrics library (`shared/metrics`), test-first
| Function | Behavior | Parameters (🔵 our choice; Strava doesn't publish its own) |
|---|---|---|
| `sportConfig` | Per sport: primary metric, auto-pause default, thresholds, MET table | Run: pace, autoPause off, moving ≥ 0.9 m/s, max 12 m/s · Walk: pace, off, ≥ 0.5 m/s, max 4 m/s · Hike: pace, off, ≥ 0.5 m/s, max 4 m/s · Ride: speed, **on**, ≥ 1.0 m/s, max 30 m/s |
| `filterTrack` | Drop accuracy > 20 m, non-increasing timestamps, implied speed > sport max; stationary gating (count the segment if `d > 0.5·max(acc)` or Doppler ≥ threshold) | Start values; tune with fixtures |
| `distance` | Σ haversine within segments only | — |
| `elapsedTime` | `finishedAt − startedAt` (wall clock) | — |
| `movingTime` | Σ Δt for pairs at ≥ threshold; Δt capped at 10 s; excludes manual pauses | 15 s rest window |
| `currentSpeed` | Smoothed over the last 10–15 s | — |
| `elevation` | Drop alt accuracy > 10 m → moving average (~10 s) → gain/loss with **10 m hysteresis** (Strava's documented non-barometric threshold, research §6) | Tune with fixtures |
| `splits` | Interpolated km (or mile) boundaries; per-split moving/elapsed time, avg speed, elevation diff; final partial split | — |
| `calories` | MET(sport, avg moving speed) × weight × moving hours; weight default 70 kg flagged as `estimatedWeight` | Compendium values |
| `simplify` + `encodePolyline` | Douglas–Peucker (≈ 5 m tolerance, ≤ 300 pts) + Google polyline encoding | — |
| `IncrementalSummary` | Live-updating version of the above; a test asserts batch == incremental | — |

**Fixtures:** Record ≥ 8 real tracks during the Phase 1 spike (walk, run, ride, hike, a stationary 5 min, a tunnel/gap, a pause-and-move, a flat loop with a known distance). Commit them as JSON under `shared/metrics/__fixtures__/`.

### 2B. Recording runtime (frontend)
| # | Task | Ref |
|---|---|---|
| 2.1 | `src/tasks/location-task.ts` (global scope, imported first in `_layout.tsx`): append batches to SQLite and emit them on the event bus | ADR-03 |
| 2.2 | Local DB module (`src/db/local.ts`): migrations, `recording_session`, `recording_point`, `kv`; WAL; exclusive transactions for appends | ADR-05 |
| 2.3 | `RecordingController`: persisted state machine `acquiring → recording ⇄ paused → finished → saved → uploaded | discarded`; segments on resume; starting a new session is impossible while one is unfinished | GPS-03, SYNC-07 |
| 2.4 | `recordingStore` (`useSyncExternalStore`): live summary for the UI; only `record.tsx` subscribes | ADR-07 |
| 2.5 | Permission flow: rationale screen → foreground → background (Android 11+ Settings) → battery-optimization helper (deep link) | GPS-01, research §2 |
| 2.6 | Record screen rebuild: pre-start GPS acquisition with accuracy halo; Stats view (per-sport metrics per research §5) and **Map view** (MapLibre, follow camera, live line ≤ 1 Hz); Pause / Resume / Finish; Android back = minimize, never discard; keep-awake option (`expo-keep-awake`, already installed) | FE-01, MET-02 |
| 2.7 | Auto-pause (per-sport setting, hysteresis 4 s pause / 2 s resume); manual pause requires manual resume | GPS-05 |
| 2.8 | Crash recovery prompt at launch (Resume / Finish / Discard) | GPS-07 |
| 2.9 | Dev-only fixture replay (feeds fixture tracks through the same pipeline; replaces the simulator) | GPS-09 |
| 2.10 | Delete `use-gps-recorder.ts`; remove recording from `AppContext` | — |

**Exit criteria:** All metric unit tests pass (≥ 90% coverage in `shared/metrics`). Device protocols **T-1…T-5** pass on 2 devices.

---

## Phase 3: Save, sync, activity APIs and screens
**Goal:** Saved activities are correct, never lost, never duplicated, and viewable. **Estimate:** 8–10 days.

| # | Task | Ref |
|---|---|---|
| 3.1 | Save screen: default title (time-of-day + sport), description, sport, visibility (pre-filled from the default setting), perceived exertion (optional), mute from feed. Remove photos, tags and private notes **or** persist them (decide; recommendation: keep perceived exertion and mute, drop the rest for MVP). Short-activity warning. | SYNC-06 |
| 3.2 | Local-first save → `state='saved'`; navigate immediately to the local activity detail | SYNC-02 |
| 3.3 | Outbox sync worker: triggers (save, app foreground, NetInfo reconnect, manual Retry); backoff; 4xx → needs attention; "Pending upload" badges | ADR-06 |
| 3.4 | `POST /activities`: zod validation, idempotent insert on `(athlete_id, client_activity_id)` (201 created / 200 existing), server recompute with `shared/metrics`, store the stream + masked `summary_polyline` | SYNC-03, SYNC-04 |
| 3.5 | `GET /activities/:id` (policy, DTO, stream masked for non-owners, `has_kudoed`); `PATCH` and `DELETE` (owner) with recompute on sport change | SYNC-05, FE-03 |
| 3.6 | `GET /athletes/:id/activities` (cursor on `(start_time, id)`, policy-filtered; the owner sees all); `GET /athletes/:id/stats` (week / year / all-time by sport, policy-aware) | FE-04 |
| 3.7 | TanStack Query setup; activity detail screen rebuilt on the typed contract (map, stats incl. elapsed + moving, splits, elevation chart, calories "estimated", owner menu: edit, delete) | ADR-09, FE-03, MET-03 |
| 3.8 | Profile: Activities (infinite list, merges local pending) + Progress (stats, 12-week chart) | FE-04 |
| 3.9 | Shared `format.ts` (units metric/imperial, h:mm:ss, pace, speed) | MET-04 |

**Exit criteria:** Protocol **T-6** passes (offline record → save → reconnect → single upload). An idempotency integration test passes with concurrent duplicates. Detail renders a seeded activity with every section.

---

## Phase 4: Social and privacy, done properly
**Goal:** Basic social features that are correct and privacy-safe. **Estimate:** 7–9 days.

| # | Task | Ref |
|---|---|---|
| 4.1 | `policy.ts` complete: `canViewActivity`, `visibleActivitiesWhere`, `toPublicActivityDTO` (hide start time from non-followers on Everyone activities, research §15), `toPublicAthleteDTO`; **visibility matrix test suite** | ADR-12 |
| 4.2 | Masking at read time: hide start/end (user setting, default **200 m**) + optional privacy zones; recompute `summary_polyline` on settings change | ADR-20, PRIV-07 |
| 4.3 | Feed: following feed, `ORDER BY end_time DESC, id DESC`, row-value cursor, counts + `has_kudoed`, `summary_polyline` only; client infinite scroll; **static SVG route preview** in cards; remove the clubs/all tabs | ADR-19, FE-02, FE-05, API-03, API-04 |
| 4.4 | Follow: `PUT`/`DELETE /athletes/:id/follow`, `GET …/followers`, `GET …/following`; screens wired; shared mutation with rollback | SOC-01, SOC-02, API-05 |
| 4.5 | Kudos: `PUT` (give-only, idempotent, no self-kudos, policy), `GET /activities/:id/kudos` (list) | SOC-03, PRIV-06 |
| 4.6 | Comments: add (≤ 1,000 chars, policy), `DELETE` (author or owner), flat list, paginated | SOC-04 |
| 4.7 | Notifications (kudos, comment, follow) via a single `NotificationService` with dedupe; list + mark read | SOC-05 |
| 4.8 | Athlete search: authenticated, min 2 chars, public DTO | PRIV-05 |
| 4.9 | Settings: units, default visibility, hide start/end distance, auto-pause per sport, keep screen on; server `user_settings` + local mirror | FE-07 |

**Exit criteria:** The visibility matrix (anonymous / stranger / follower / owner × PUBLIC / FOLLOWERS_ONLY / ONLY_ME × detail / feed / profile list / stats / kudos / comments / export) is 100% green. A contract test shows no PII in public responses. E2E with two accounts: follow → see the feed → kudos → comment → notifications.

---

## Phase 5: UI/UX redesign and MVP polish
**Goal:** Address the "UI/UX is not satisfactory" concern on top of a working core. **Estimate:** 8–12 days.

| # | Task |
|---|---|
| 5.1 | Styling decision spike (NativeWind 5 stable vs StyleSheet + tokens); pin versions; design tokens (color, type scale, spacing) in `theme.ts` (ADR-21) |
| 5.2 | Redesign the MVP screens only: Feed, Record (stats + map), Save, Activity detail, Profile, Search, Notifications, Settings, Onboarding (name, city, weight optional, permissions rationale). **Original visual design inspired by fitness-app conventions; do not copy Strava's branding, logo or exact layouts.** |
| 5.3 | Loading / empty / error states for every screen; accessibility (contrast, font scaling, touch targets ≥ 48 dp) |
| 5.4 | Map tile provider with app-appropriate terms + attribution; remove the Leaflet/WebView fallback and the Expo Go sign-in fallback; remove unused deps (FE-09, FE-11) |
| 5.5 | Hide or remove remaining out-of-scope entry points; delete `src/mock/data.ts` (FE-13, QA-04) |

## Phase 6 (post-MVP backlog, ordered)
1. Photos and avatars on **R2** (ADR-10).
2. Follow approval / private profile; remove follower; block (research §12).
3. Hidden Details (hide pace, HR, calories, start time per activity) (research §15).
4. Server-side DEM elevation correction (research §6).
5. Accelerometer-assisted auto-pause for runs (research §8).
6. Soft delete with a 30-day restore (research §9).
7. Heart-rate sensor (BLE) support.
8. Re-enable selected out-of-scope modules (clubs, routes) one at a time, each with its own audit.

---

## Device test protocols (referenced throughout)

Run on **≥ 2 physical Android devices** (one Pixel/AOSP-like, one Samsung or Xiaomi) using a **release-like build**. Record the results in `docs/test-reports/<date>-<device>.md`.

| ID | Protocol | Pass criteria |
|---|---|---|
| **T-1** Accuracy | Walk a known route (≥ 1 km, measured on a map / athletics track: 400 m lane 1 × 3) with the screen on | Distance within ±3%; moving time within ±5 s of a stopwatch |
| **T-2** Drift and elevation | Start recording, place the phone stationary outdoors for 5 min, then walk a flat 30 min loop | Stationary distance ≤ 20 m; stationary moving time ≤ 10 s; flat-loop elevation gain ≤ 15 m |
| **T-3** Background / screen lock | Start a 20 min walk, lock the screen after 1 min, keep the phone in a pocket, unlock at the end | No point gap > 10 s; elapsed = wall clock ±2 s; notification visible throughout; distance within ±3% of T-1-style reference |
| **T-4** Lifecycle | Script: start → pause → walk 200 m → resume → finish → back → back → record tab → (attempt start) → save | Paused movement not counted (±5 m); no path loses the finished activity; a new start is blocked while one is unsaved |
| **T-5** Crash recovery | Mid-activity: `adb shell am force-stop <pkg>`; relaunch | Recovery prompt; points up to ≤ 5 s before the kill present; Resume creates a new segment, with no teleport distance |
| **T-6** Offline sync | Airplane mode → record 5 min → save → kill app → disable airplane mode → open app | Activity listed as pending, then uploaded within 30 s of foreground; exactly one server row; detail correct |
| **T-7** Battery (informational) | 60 min recording, screen off, map view not open | Record battery % used (target ≤ 10%/h on reference devices; investigate if higher) |
| **T-8** OEM killer | T-3 on Xiaomi/Samsung with default battery settings, then with the in-app guidance applied | Document behavior; the guidance must make T-3 pass |

---

## Definition of done (applies to every task)
- Typecheck, lint and tests pass in CI. New logic has unit tests. Endpoints have integration tests including authz.
- No `any` in new code at API boundaries.
- No fabricated values displayed: missing data shows "—" or the section is hidden.
- Every user-visible control has a real effect, or it is not shown.
- For recording changes: the relevant device protocols are re-run and recorded.

---

## Prioritized roadmap (summary)

| Priority | Phase | Outcome | Est. (person-days) | Closes |
|---|---|---|---|---|
| **P0 (now)** | Phase 0: Hotfix | No backdoor, rotated secrets, privacy enforced on the deployed API, visibility actually saved | 2–3 | SEC-01…07, PRIV-01…06, SYNC-01 |
| **P1** | Phase 1: Foundations | Dev builds, env config, CI/tests, shared contracts, DB per request, schema v2; **background-location spike** | 5–7 | API-01/02, FE-06, SEC-08, QA-01…03 |
| **P1** | Phase 2: Recording engine | Background, crash-safe, accurate recording with live map for Run/Walk/Hike/Ride | 10–14 | GPS-01…11, MET-01…04, FE-01, SYNC-07/08 |
| **P1** | Phase 3: Save, sync and activity | Offline-first save, idempotent upload, detail, history, stats, edit/delete | 8–10 | SYNC-02…06, FE-03/04 |
| **P2** | Phase 4: Social and privacy | Following feed, follow, kudos, comments, notifications, hide start/end, settings | 7–9 | SOC-01…05, FE-02/05/07, PRIV-07, API-03…05 |
| **P2** | Phase 5: UI/UX and polish | Redesigned MVP screens, honest states, map licensing, scope cleanup | 8–12 | FE-09…13, QA-04 |
| **P3** | Phase 6: Backlog | Photos (R2), follow approval, hidden details, DEM elevation, … | — | API-06, SOC-06 |

**Total to a functional MVP (Phases 0–5): roughly 40–55 person-days for one engineer**, or about 5–7 weeks with two engineers working the backend and frontend tracks in parallel after Phase 1 (Phases 3 and 4 have parallelizable backend/frontend halves).

### Decisions needed from the team leader before Phase 1
1. **Sign-in method:** Google-only (recommended) or keep email/password (adds PBKDF2 + email verification work)?
2. **Final Android package id and app name** (permanent; tied to Google OAuth config).
3. **Reset existing database data** (currently seed/demo data) during the schema v2 migration: yes/no?
4. **Map tile provider** (MapTiler / Stadia / self-hosted Protomaps on R2) and budget.
5. **History purge** of the committed credentials (force-push) or rotation only.
6. Confirm the **MVP navigation** in ADR-15 (Feed, Record, Profile, Search, Notifications, Settings) and that the other modules are hidden.
