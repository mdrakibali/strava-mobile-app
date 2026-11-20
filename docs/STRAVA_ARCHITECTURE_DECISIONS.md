# Architecture Decisions: Audit Verdicts and Target Design

**Date:** 2026-11-19 · **Audited commit:** `1f954d8`
Each decision is classified as follows:

| Label | Meaning |
|---|---|
| **CORRECT** | Keep as is |
| **ACCEPTABLE** | Keep; improve later |
| **SUBOPTIMAL** | Works, but a better approach is recommended |
| **INCORRECT** | Must change |
| **MISSING** | Not implemented |
| **UNVERIFIED** | Cannot be confirmed from the repository |

Evidence references point to [STRAVA_TECHNICAL_AUDIT.md](STRAVA_TECHNICAL_AUDIT.md) finding IDs and to source lines. Strava behavior references point to [STRAVA_PRODUCT_RESEARCH.md](STRAVA_PRODUCT_RESEARCH.md) (§n).

**Guiding principles for this rebuild**
1. **Keep the platform; replace the broken core.** The stack the team confirmed is sound. The defects are in how the recording, sync and privacy logic were written, not in the choice of tools.
2. **Correctness lives in pure, tested modules.** Metrics, filtering and the privacy policy are pure TypeScript with fixture-based tests. UI and IO are thin layers around them.
3. **Local-first for anything the user creates while moving.** The phone is the source of truth until the server acknowledges.
4. **The server is the authority for privacy and stored metrics.** The client is never trusted for visibility enforcement and is only provisionally trusted for metrics.
5. **No new dependency without a reason that a built-in can't satisfy.**

---

## Summary table

| # | Decision area | Existing approach | Verdict | Target |
|---|---|---|---|---|
| ADR-01 | App framework | Expo SDK 58 + Expo Router + TS | **CORRECT** | Keep. Move to **development builds** (Expo Go can't do background location) |
| ADR-02 | Target platform / app identity | Android only; package `com.anonymous.mobilefrontend` | **INCORRECT** (identity) | Choose a permanent package id now |
| ADR-03 | Location acquisition | `watchPositionAsync` (foreground only) | **INCORRECT** | `startLocationUpdatesAsync` + TaskManager + foreground service |
| ADR-04 | Metric computation | Inline in hook, per fix, ad hoc | **INCORRECT** | Pure `metrics/` module, raw points stored, filters at compute time |
| ADR-05 | On-device persistence | None (memory only; AsyncStorage for token) | **MISSING** | `expo-sqlite` recording journal + local activity store |
| ADR-06 | Activity upload | Fire-and-forget, discard on failure | **INCORRECT** | Outbox with retries + idempotency key |
| ADR-07 | Client state management | One giant `AppContext` incl. 1 Hz recording state | **SUBOPTIMAL** | Split: auth context, recording store, server-state cache |
| ADR-08 | Backend runtime and DB driver | Hono on Workers ✓; `new Pool` per call ✗ | **CORRECT** / **INCORRECT** | Keep Hono/Workers/Hyperdrive; one client per request |
| ADR-09 | Server-state caching on client | Hand-rolled arrays in context, optimistic without rollback | **SUBOPTIMAL** | TanStack Query |
| ADR-10 | Object storage | Not configured (Unsplash URLs) | **MISSING** | R2 binding when photos/avatars ship (Phase 4) |
| ADR-11 | API contracts | `any` on both sides | **INCORRECT** | Shared types + zod validation at the server edge |
| ADR-12 | Authorization / privacy enforcement | Absent or scattered | **INCORRECT** | One `policy` module used by every read path |
| ADR-13 | Authentication | Google + email/password, HS256 JWT 30 d, demo backdoor | **INCORRECT** (parts) | Google-only, fail-closed secrets, SecureStore |
| ADR-14 | Maps | MapLibre ✓; Leaflet WebView fallback; live map per feed card | **CORRECT** / **SUBOPTIMAL** / **INCORRECT** | MapLibre only; static previews in lists; licensed tiles |
| ADR-15 | Product scope in code | ~25 out-of-scope screens + 9 backend modules live | **SUBOPTIMAL** | Feature-flag off in MVP |
| ADR-16 | Database and ORM | Neon Postgres + Drizzle | **CORRECT** | Keep; fix schema, ids, indexes, migrations |
| ADR-17 | GPS track storage | JSONB array of point objects, raw + masked copies in the row | **SUBOPTIMAL** | Points table or compressed blob + encoded summary polyline |
| ADR-18 | Backend layering | Controller → service → repository (half the modules) | **CORRECT** | Keep for in-scope modules |
| ADR-19 | Feed generation | Fan-out-on-read SQL query, cursor pagination | **CORRECT** (concept) / **INCORRECT** (filters) | Keep the model; fix visibility, cursor, payload |
| ADR-20 | Privacy-zone masking | Server-side point drop at upload | **ACCEPTABLE** | Add default hide start/end 200 m; mask at read or on change |
| ADR-21 | Styling | NativeWind 5 **RC** + inline styles mixed | **UNVERIFIED** stability | Pin versions; one approach for new code |
| ADR-22 | Token storage | AsyncStorage | **SUBOPTIMAL** | `expo-secure-store` |
| ADR-23 | Testing / CI | None | **MISSING** | Vitest (backend), jest-expo (frontend), GitHub Actions |
| ADR-24 | Secrets and config | Credentials in source; prod URL hard-coded | **INCORRECT** | Env-based config, rotated secrets |
| ADR-25 | Pagination primitive | Base64 cursor `(timestamp,id)` | **CORRECT** (concept) | Fix the WHERE clause to a row comparison |

---

## ADR-01 · Expo SDK 58 + Expo Router; switch to development builds
- **Verdict:** CORRECT (framework) / INCORRECT (Expo Go as the runtime)
- **Existing approach:** Expo managed workflow with CNG (no `android/` dir), Expo Router file routes, TypeScript strict. There is a Leaflet fallback and an `expo-auth-session` fallback specifically so the app runs in Expo Go.
- **Evidence:** `mobile-frontend/package.json`; `src/components/map/StravaMapView.tsx` (`isExpoGo` check); `src/app/auth/login.tsx:25-75`.
- **Why:** Expo provides first-party location, task manager, SQLite and secure store modules with config plugins. That is the shortest correct path to a background-capable Android tracker in TS. However, per the Expo SDK 58 docs, *"TaskManager is not available on Android"* in Expo Go and foreground services are unavailable there. A fitness recorder **cannot** be tested in Expo Go.
- **Target:** Keep Expo. Use `expo-dev-client` builds (`eas build --profile development` or `npx expo run:android`) as the only supported runtime. Delete the Expo Go fallbacks (Leaflet map, auth-session).
- **Complexity / impact:** Low effort. High impact, because it unblocks background location.
- **Files:** `app.json`, `eas.json` (new), `src/components/map/*`, `src/app/auth/login.tsx`.

## ADR-02 · Android-only; fix app identity
- **Verdict:** INCORRECT (identity), CORRECT (Android-only focus)
- **Existing:** `android.package = com.anonymous.mobilefrontend`, name `mobile-frontend`, invalid `android.gradleProperties` key (expo-doctor).
- **Why it matters:** The package id is permanent on Google Play and is bound to the Google Sign-In OAuth client (SHA-1 + package). Changing it later breaks sign-in configuration.
- **Target:** Decide the final id (e.g. `com.<company>.<app>`) **before** creating production OAuth clients. Remove the invalid key, or use `expo-build-properties` if Gradle memory tuning is really needed.
- **Complexity:** Trivial. **Files:** `app.json`, Google Cloud OAuth client config.

## ADR-03 · Location acquisition: background location task with a foreground service
- **Verdict:** INCORRECT. Findings GPS-01, GPS-02, GPS-10.
- **Existing approach:** `Location.watchPositionAsync({ accuracy: BestForNavigation, timeInterval: 1000, distanceInterval: 1 })` inside a React hook. Time comes from `setInterval`. Only foreground permission is requested.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:85-170, 173-228`; `app.json` (no background options; `locationAlwaysAndWhenInUsePermission` is iOS-only).
- **Why it is incorrect:** Per Expo docs, `watchPositionAsync` only delivers while the app is in the foreground. Users run with the screen off. Strava itself tells Android users to allow background GPS and exempt the app from battery optimization (research §2).
- **Target design:**
  ```
  src/tasks/location-task.ts   (imported first in app/_layout.tsx; global scope)
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
      const { locations } = data;              // batch
      await recordingRepo.appendPoints(activeSessionId, locations);  // SQLite txn
      recordingBus.emit(locations);            // live UI if JS context alive
    });

  start():  requestForeground → (rationale UI) → requestBackground
            → Location.startLocationUpdatesAsync(LOCATION_TASK, {
                 accuracy: Location.Accuracy.BestForNavigation,
                 timeInterval: 1000, distanceInterval: 0,
                 foregroundService: { notificationTitle, notificationBody,
                                      notificationColor: '#FC4C02',
                                      killServiceOnDestroy: false } })
  pause():  keep updates running (for the live map/GPS halo) but mark
            pause interval; points tagged with segment index = -1 (ignored)
            — or stop updates to save battery (configurable; default keep)
  finish(): stopLocationUpdatesAsync; session → 'finished'
  ```
  The `app.json` `expo-location` plugin gets `isAndroidBackgroundLocationEnabled: true`. `isAndroidForegroundServiceEnabled` then defaults to true, which adds `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION` (the latter required on Android 14+).
- **Alternatives considered:** `react-native-background-geolocation` (Transistor) has excellent motion detection but needs a **commercial Android license**, so it was rejected. A custom native module is too costly. `expo-location` is already a dependency and is sufficient.
- **New dependency:** `expo-task-manager` (required by the API, first-party).
- **Risks:** OEM battery killers (Xiaomi/Huawei/Samsung) can still stop foreground services. Mitigate with in-app guidance (as Strava does), a gap detector, and the recovery flow (ADR-05). *Whether `expo-sqlite` can run inside the headless task context is not stated in the Expo docs (UNVERIFIED). Verify it in a spike as the first task of Phase 1. The fallback is to buffer in the task and flush to SQLite from the JS context. Since the foreground service keeps the JS runtime alive in practice, the risk is low but must be tested.*
- **Complexity / impact:** Medium effort. Critical impact.
- **Files:** new `src/tasks/location-task.ts`, new `src/recording/*`, `app.json`, `src/app/_layout.tsx`, `src/app/record.tsx`, remove `src/hooks/use-gps-recorder.ts`.

## ADR-04 · Metric computation: pure module over stored raw points
- **Verdict:** INCORRECT. Findings GPS-03…06, GPS-08, GPS-11, MET-01…04.
- **Existing:** Distance, elevation, splits and speed are incrementally mutated inside `setState` per fix, with ad hoc thresholds (0.8 m, 0.6 m, 0.8 m/s). Calories are computed in three different places with three different formulas.
- **Why incorrect:** Results can't be tested, can't be recomputed after a bug fix, and differ between the live screen, the save screen and the server.
- **Target:** `metrics/` (pure TS, no React or Expo imports), **shared by client and server**. It lives in a top-level `shared/` package imported via a TS path alias, or is copied with a contract test if a workspace setup is too heavy.
  - `filterTrack(points, sportConfig) → AcceptedPoint[]` (accuracy, timestamp monotonicity, implied-speed plausibility, stationary gating).
  - `computeSummary(segments, sportConfig, athlete) → { distance, movingTime, elapsedTime, avgSpeed, maxSpeed, elevationGain, elevHigh, elevLow, calories, splits[] }`.
  - `IncrementalSummary`: the same math applied incrementally for the live screen. A test asserts that `incremental == batch` on fixtures.
  - `sportConfig` table (research §1).
  - `simplify(points, toleranceM)` (Douglas–Peucker) and `encodePolyline()` (Google polyline algorithm, ~40 LOC, no dependency).
- **Parameters:** Our engineering choices (Strava does not publish its own, research §4/§8) are listed in the implementation plan and must be tuned against recorded fixtures.
- **Complexity:** Medium. **Impact:** High (correctness). **Files:** new `shared/metrics/*`; consumers: recorder, save, backend activity service.

## ADR-05 · On-device persistence: `expo-sqlite`
- **Verdict:** MISSING. Findings GPS-07, SYNC-02, SYNC-07.
- **Existing:** No local DB. AsyncStorage holds the token and profile JSON only. `expo-sqlite` is **not** a dependency, contrary to the brief's assumption.
- **Target schema (local):**
  ```sql
  PRAGMA journal_mode = WAL;
  CREATE TABLE recording_session (
    id TEXT PRIMARY KEY,               -- client UUID (= client_activity_id)
    sport TEXT NOT NULL,
    state TEXT NOT NULL,               -- acquiring|recording|paused|finished|saved|uploaded|discarded
    started_at INTEGER, finished_at INTEGER,
    pauses TEXT NOT NULL DEFAULT '[]', -- [[startMs,endMs],...]
    segment_idx INTEGER NOT NULL DEFAULT 0,
    save_input TEXT,                   -- JSON: title, description, sport, visibility, ...
    summary TEXT,                      -- JSON: computed summary at finish
    upload_attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT, server_activity_id TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE recording_point (
    session_id TEXT NOT NULL, seq INTEGER NOT NULL, segment_idx INTEGER NOT NULL,
    ts INTEGER NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
    acc REAL, alt REAL, alt_acc REAL, speed REAL, heading REAL,
    PRIMARY KEY (session_id, seq)
  );
  CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT); -- settings mirror
  ```
- **Why SQLite rather than AsyncStorage or MMKV:** Append-heavy writes of thousands of rows need transactions and partial reads (last N points for the map). AsyncStorage rewrites whole values. SQLite is first-party in Expo and is what the brief named. Use `withExclusiveTransactionAsync` for the appends, because the Expo docs warn that `withTransactionAsync` captures unrelated concurrent queries.
- **Retention:** Delete points after a confirmed upload plus N days (keep the summary).
- **New dependency:** `expo-sqlite` (first-party).
- **Complexity:** Medium. **Impact:** Critical (no data loss). **Files:** new `src/db/*` (local), recorder, sync.

## ADR-06 · Upload: transactional outbox + idempotency key
- **Verdict:** INCORRECT. Findings SYNC-01…03.
- **Existing:** `api.activities.create(...)` is awaited once. On failure it logs and discards. The server generates the id. Visibility and startTime are not sent.
- **Target:**
  - Client: `syncWorker.run()` is triggered on app foreground, on network regained (`@react-native-community/netinfo`, or a simple retry timer if we want to avoid the dependency; recommendation: NetInfo, which Expo supports), after save, and on manual Retry. It processes `state='saved'` sessions oldest first with exponential backoff (1 s → 5 min cap). 4xx validation errors → `state='needs_attention'` (shown to the user). 5xx or network errors → retry.
  - Request: `POST /activities` with `clientActivityId`, `startTime`, `timezone`, `sport`, `visibility`, title, description, hideFromHome, perceivedExertion, a client summary, and points (gzip-compressed JSON body if > 100 KB; Workers support `DecompressionStream`).
  - Server: `INSERT ... ON CONFLICT (athlete_id, client_activity_id) DO NOTHING RETURNING *`. On conflict it selects the existing row and returns **200** (otherwise 201). It recomputes the summary from the points with the shared metrics module and stores the authoritative values.
- **Precedent:** Strava's offline recording uploads automatically when connectivity returns and offers Retry for pending uploads (research §9). Its upload API carries an `external_id` (research §16).
- **Complexity:** Medium. **Impact:** Critical. **Files:** `src/sync/*` (new), `services/api.ts`, `mobile-backend/src/services/activity.service.ts`, schema.

## ADR-07 · Client state: split the god-context
- **Verdict:** SUBOPTIMAL. Finding SYNC-08.
- **Existing:** `AppContext` (663 lines) owns auth, feed, clubs, challenges, events, segments, notifications and the live recording. Every 1 Hz tick re-renders all consumers.
- **Target:**
  - `AuthProvider` (user, token, login/logout). Rarely changes.
  - `recordingStore`: a small module-level store read via `useSyncExternalStore` with selectors (no dependency), or Zustand (~1 KB) if the team prefers. Only `record.tsx` subscribes to fast-changing fields.
  - Server data via TanStack Query (ADR-09).
- **Complexity:** Medium (touches most screens, mechanically). **Impact:** Medium-High (performance, correctness of optimistic updates).

## ADR-08 · Backend runtime (Hono on Workers + Hyperdrive) and DB connection handling
- **Verdict:** CORRECT (runtime) / INCORRECT (connection pattern). Finding API-01.
- **Existing:** Hono on Cloudflare Workers with `nodejs_compat`, `pg` via a Hyperdrive binding, and `getDb()` creating `new Pool({max:1})` at 45 call sites, never closed.
- **Why the runtime is correct:** Hono is the idiomatic Workers framework. Hyperdrive gives pooled, low-latency Postgres from the edge to Neon. It matches the confirmed stack.
- **Target:** A middleware creates **one** `pg.Client` per request from `env.HYPERDRIVE.connectionString`, sets it on the context, and closes it via `c.executionCtx.waitUntil(client.end())` (Cloudflare's documented Hyperdrive + `pg` pattern). Repositories receive the drizzle instance from the context. Remove the `DATABASE_URL` direct fallback in production, or keep it for local `wrangler dev` only. Remove the unused `@neondatabase/serverless` dependency from the Worker, or use it only for scripts.
- **Complexity:** Low. **Impact:** High (reliability under load). **Files:** `src/lib/db.ts`, new `src/middleware/db.ts`, controllers.

## ADR-09 · Server-state cache on the client: TanStack Query
- **Verdict:** SUBOPTIMAL. Findings SOC-03, FE-04, FE-05.
- **Existing:** Arrays in context. Optimistic updates without rollback. Detail state duplicated in the screen, so kudos on detail don't update the feed and vice versa. No pagination.
- **Target:** `@tanstack/react-query`: `useInfiniteQuery` for the feed and profile lists, `useQuery` for detail, `useMutation` with `onMutate`/`onError` rollback for kudos, comments and follow. Use query keys per activity so the feed and detail share data.
- **Justification for a new dependency:** Pagination, cache invalidation, retries, rollback and focus refetch would otherwise be hand-written. That hand-written approach is exactly where the current code is buggy. It is the de facto standard, small, and works with RN.
- **Complexity:** Medium. **Impact:** High for the social features.

## ADR-10 · Object storage (R2)
- **Verdict:** MISSING (acceptable for now).
- **Existing:** No binding. Photos are an unused JSON column. Avatars default to one Unsplash stock photo for every user.
- **Target (Phase 4):** An R2 bucket binding, `POST /uploads/avatar` and `POST /activities/:id/photos` streaming through the Worker with content-type and size limits (≤ 10 MB, JPEG/PNG/WebP), stored under `athletes/{id}/…`, served via a public R2 custom domain or Worker GET with authz for non-public activities. Until then: initials avatars (no stock photos of strangers).
- **Optional use:** store compressed raw tracks in R2 instead of Postgres (ADR-17).

## ADR-11 · API contracts: shared types + runtime validation
- **Verdict:** INCORRECT. Findings FE-03, SYNC-01, SYNC-04, QA-03.
- **Existing:** `request<any>`. Controllers spread `body` into DTOs. The detail screen reads fields that the server doesn't send, and the compiler can't tell.
- **Target:** A `shared/contracts/` folder with **zod** schemas for each in-scope endpoint (request + response). The server validates requests (`@hono/zod-validator`). The client uses `z.infer` types, and in `__DEV__` it also parses responses to catch drift early. Repository layout: keep two packages and add a third `shared/` folder referenced via `tsconfig` `paths` in both (Metro resolves it via `watchFolders`). Avoid a full monorepo tool migration for now.
- **New dependency:** `zod` (+ `@hono/zod-validator`). Justified: replaces hand validation in ~15 endpoints and gives compile-time types for free.
- **Complexity:** Medium. **Impact:** High.

## ADR-12 · Authorization: one policy module
- **Verdict:** INCORRECT. Findings PRIV-01…06.
- **Existing:** Visibility is checked only in the public feed branch. The raw polyline is stripped only on the detail endpoint. All other paths leak.
- **Target:** `src/lib/policy.ts`:
  ```ts
  type Viewer = { id: string } | null;
  canViewActivity(viewer, activity, rel: { isFollower: boolean }): boolean
  visibleActivitiesWhere(viewerId): SQL   // reusable Drizzle predicate
  toPublicActivityDTO(activity, viewer, rel)   // strips raw track, start time
                                               // for non-followers, hidden fields
  toPublicAthleteDTO(athlete, viewer, rel)
  ```
  Every in-scope read path uses these helpers, and DTOs are built by **whitelisting** fields. Invisible resources return 404. A test matrix (viewer × visibility × relation) is mandatory.
- **Complexity:** Medium. **Impact:** Critical.

## ADR-13 · Authentication
- **Verdict:** INCORRECT in parts. Findings SEC-02…06, SEC-08.
- **Existing:** Google ID token verification via JWKS (**CORRECT** approach). Email/password with SHA-256 static salt (**INCORRECT**). Demo/mock backdoor (**INCORRECT**). HS256 JWT, 30 days, fallback secret (**INCORRECT** fallback). Account linking by email (**INCORRECT**). Two Google sign-in client implementations (**SUBOPTIMAL**).
- **Target (recommended):** **Google-only sign-in** for the MVP. Native `@react-native-google-signin` gives an ID token, the backend verifies `aud ∈ allowlist`, `email_verified`, and `iss`. Our JWT uses `JWT_SECRET` (required, ≥ 32 bytes), with `iss`/`aud` claims and a 30-day lifetime (acceptable for MVP; refresh rotation post-MVP). The token lives in SecureStore. The demo login exists only when `ENVIRONMENT=development`.
  - If the team needs email/password: PBKDF2-SHA256 via WebCrypto with per-user salt, plus email verification before linking.
- **Complexity:** Low–Medium. **Impact:** Critical.

## ADR-14 · Maps
- **Verdict:** MapLibre **CORRECT**. CARTO styles **UNVERIFIED** (license terms). Leaflet/WebView fallback **SUBOPTIMAL** (remove). Live map per feed card **INCORRECT** (FE-02). No map on the record screen **MISSING** (FE-01).
- **Why MapLibre is correct:** Open source, native GL rendering, no per-map-load fee, and offline/PMTiles capable. It is already integrated (`@maplibre/maplibre-react-native` v11 with a config plugin). Replacing it with Google Maps would add billing and API-key management for no functional gain in this scope. **Do not replace it.**
- **Target:**
  - A single `MapView` wrapper (MapLibre only). Style URL from `EXPO_PUBLIC_MAP_STYLE_URL`. A provider with explicit terms for mobile apps (MapTiler / Stadia / self-hosted Protomaps on R2). Attribution control enabled.
  - **Record screen:** map view with a follow-user camera, route `LineLayer` fed from a `ShapeSource` updated ≤ 1 Hz, and the GPS accuracy halo.
  - **Detail screen:** interactive map, fit to bounds, masked polyline for non-owners.
  - **Lists (feed, profile):** **static SVG polyline preview** from `summary_polyline` (`react-native-svg` already installed). There are no GL views in lists.
- **Complexity:** Medium. **Impact:** High (UX and performance).

## ADR-15 · Scope control: feature-flag out-of-scope modules
- **Verdict:** SUBOPTIMAL.
- **Existing:** Clubs, challenges, events, segments, routes (builder, navigation), goals, messages, beacon, analytics (fitness/freshness, race predictions, training plans, heatmap, relative effort, matched activities), and GPX import are all routed and visible. Several are fake or broken (SEC-07, FE-08, FE-13).
- **Decision:** The MVP surface is **Feed, Record, Activity detail, Profile (history, progress, followers/following), Search athletes, Notifications (kudos, comment, follow), Settings (units, default visibility, hide start/end, auto-pause, account)**.
  - Frontend: hide tabs and entry points behind `EXPO_PUBLIC_FEATURE_<NAME>=false`. Keep the files (cheap to keep, avoids churn) but exclude them from navigation.
  - Backend: mount out-of-scope routers only when `FEATURES` includes them. In production, mount none of them.
  - **Clubs tab in the feed is removed** (it also leaks privacy, PRIV-02).
- **Complexity:** Low. **Impact:** High (focus, smaller attack surface, honest UX).

## ADR-16 · Database (Neon Postgres + Drizzle)
- **Verdict:** CORRECT (technology). Schema ACCEPTABLE with changes. Migration tooling SUBOPTIMAL.
- **Existing:** 21 tables, text ids `act_<ms>_<rand>`, decimals for metrics, a single secondary index, a hand-written `scripts/migrate.js` with an embedded password.
- **Target changes (in-scope tables):**
  - `activities`: add `client_activity_id uuid NOT NULL` + `UNIQUE(athlete_id, client_activity_id)`, `end_time timestamptz` (feed ordering; research §13), `timezone text`, `summary_polyline text` (masked + simplified), `elev_high_m`, `elev_low_m`, `perceived_exertion smallint NULL`, `private_note text NULL`, and rename `exclude_from_feed` → `hide_from_home` (Strava's name). Use pgEnums for `visibility` and `sport_type`. Add `CHECK (moving_time_s <= elapsed_time_s)`. Drop `relative_effort_score` and `gap_formatted` (out of scope / incorrect).
  - Ids: **UUID** (`gen_random_uuid()` or UUIDv7 from the client for activities). This removes enumerability (PRIV-01).
  - `athletes`: `weight_kg` nullable (no invented defaults); add `default_visibility`, `units`, `hide_start_end_m` (default 200, per research §15). Remove fabricated defaults.
  - `follows`: index `(following_id)`. Add `status` later for approval.
  - `comments`: index `(activity_id, created_at)`. `content` length check.
  - `kudos`: keep the unique index.
  - `notifications`: index `(recipient_id, created_at desc)`. Add a dedupe unique key.
  - Migrations: `drizzle-kit generate` + `drizzle-kit migrate` with `DATABASE_URL` from the env. Delete `scripts/migrate.js`. Use **Neon branches** for staging/preview databases.
- **Note on numeric types:** Drizzle returns `decimal` as strings, and the code converts back and forth (`String(x)`, `Number(x)`). Use `double precision` / `real` for metrics (they are measurements, not money). That simplifies the code and removes the overflow bug (SYNC-04).
- **Complexity:** Medium (one migration with backfill for existing rows; the current data is seed or demo data and can be reset after agreement).

## ADR-17 · GPS track storage
- **Verdict:** SUBOPTIMAL.
- **Existing:** `raw_polyline` and `masked_polyline` are JSONB arrays of `{latitude, longitude, altitude, timestamp, speed}` in the activities row. The whole row (raw track included) is selected on every read, e.g. `select()` in the feed and profile.
- **Target:** Split hot from cold data. The `activities` row holds the summary and `summary_polyline` (encoded, ~1–3 KB). The full stream goes in an `activity_streams` table (`activity_id PK`, `points jsonb` or columnar arrays: `lat float8[]`, `lng float8[]`, `t int[]`, `alt real[]`), fetched only by the detail endpoint (masked for non-owners, computed at read time with the policy). Alternatively, store a gzip JSON blob in R2 (`streams/{activityId}.json.gz`) once R2 is added. PostGIS is not needed for MVP scope (no segments or spatial queries).
- **Complexity:** Medium (bundled with the ADR-16 migration).

## ADR-18 · Backend layering
- **Verdict:** CORRECT (controller → service → repository, constructor-injected repos).
- **Keep** for activities, athletes, feed, auth and notifications. Pass the per-request DB from the context (ADR-08). Centralize notification creation in `NotificationService` (currently duplicated in 4 places). The inline-route modules are out of scope (ADR-15).

## ADR-19 · Feed model
- **Verdict:** CORRECT (fan-out-on-read with a SQL query and a cursor) / INCORRECT (filters, cursor, payload).
- **Why the concept is right:** At MVP scale (thousands of users) a single indexed query `WHERE athlete_id = ANY($followed) …` is simpler and more correct than fan-out-on-write timelines.
- **Target:** The query uses the `visibleActivitiesWhere` predicate, `ORDER BY end_time DESC, id DESC` with a row-value cursor, and returns `summary_polyline` only, plus correlated counts or denormalized counters and `EXISTS` for `has_kudoed`. Revisit at ~1M activities or > 1k follows per user.

## ADR-20 · Privacy masking
- **Verdict:** ACCEPTABLE (server-side is right) but incomplete. Finding PRIV-07.
- **Target:** Masking runs at **read time** in `toPublicActivityDTO`, applying (a) hide start/end N m (user setting, default 200 m, matching Strava's new-account default) and (b) privacy zones. The summary polyline stored for feeds is precomputed with the same function and recomputed when settings change (a background job via `ctx.waitUntil` or a Cloudflare Queue later).

## ADR-21 · Styling (NativeWind 5 RC)
- **Verdict:** UNVERIFIED stability. Finding FE-12.
- **Existing:** `nativewind@^5.0.0-rc.1`, `react-native-css@^3.1.0-rc.1`, Tailwind 4. Recent commits replaced classes with inline styles to fix crashes.
- **Target:** Do not migrate during the core rebuild. Pin exact versions. When the UI phase starts, run a 1-day spike: if NativeWind 5 is stable by then, keep it. Otherwise standardize on `StyleSheet` + a `theme.ts` token module (`src/constants/theme.ts` already exists). Either way, pick one approach for new code.

## ADR-22 · Token storage
- **Verdict:** SUBOPTIMAL → `expo-secure-store` (first-party, Keystore-backed on Android). Finding SEC-08.

## ADR-23 · Testing and CI
- **Verdict:** MISSING. Findings QA-01…03.
- **Target:**
  - `shared/metrics` + `policy`: **Vitest** (runs in Node; no RN needed), ≥ 90% coverage, with fixture tracks.
  - Backend: Vitest + `app.request()` against a **real Postgres** (a Neon branch per CI run, or Docker `postgres:16` in CI). Visibility matrix and idempotency tests are mandatory.
  - Frontend: `jest-expo` for hooks and components that matter (recorder state machine, outbox, mappers). Manual device protocol for GPS (no reliable automation for real GNSS).
  - GitHub Actions: typecheck, lint (`eslint-config-expo` flat config; `typescript-eslint` for the backend), tests, secret scan.

## ADR-24 · Secrets and environment configuration
- **Verdict:** INCORRECT. Findings SEC-01, SEC-04, FE-06.
- **Target:** Backend: `.dev.vars` (git-ignored) plus `.dev.vars.example`. Production secrets via `wrangler secret put` (`JWT_SECRET`). `DATABASE_URL` only for local and scripts. Use a separate `wrangler.jsonc` env for staging (`[env.staging]`). Frontend: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MAP_STYLE_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and feature flags, set per EAS build profile. **Rotate the Neon password and JWT secret.**

## ADR-25 · Pagination primitive
- **Verdict:** CORRECT (opaque base64 cursor of `(timestamp, id)`), INCORRECT usage (API-03). Fix: `WHERE (end_time, id) < ($ts, $id)`.

---

## New dependencies introduced by this plan (and why)

| Package | Why it is needed | Alternative rejected |
|---|---|---|
| `expo-task-manager` | Required by `startLocationUpdatesAsync` for background location | — |
| `expo-sqlite` | Crash-safe recording journal + offline outbox | AsyncStorage (whole-value rewrites, no transactions) |
| `expo-secure-store` | Token at rest | AsyncStorage (plain) |
| `expo-dev-client` | Development builds (Expo Go can't run background location) | Expo Go |
| `@tanstack/react-query` | Pagination, cache, rollback, retries | Hand-rolled (the current bugs) |
| `zod` (+ `@hono/zod-validator`) | Shared contracts and request validation | Hand validation per endpoint |
| `@react-native-community/netinfo` | Trigger sync on reconnect | Polling timer (acceptable fallback) |
| `vitest`, `jest-expo` (dev) | Tests | — |

**Explicitly not adding:** a Redux-class state library, a new map SDK, a commercial background-geolocation SDK, an ORM change, PostGIS (not needed without segments), or a monorepo tool (a `shared/` folder plus TS paths is enough).

## Dependencies to remove once unused
`expo-auth-session`, `expo-crypto` (if only used by the auth-session fallback), `react-native-webview` (if only used by the Leaflet fallback; verify no other usage), and `@neondatabase/serverless` in the Worker (scripts can keep it as a devDependency).
