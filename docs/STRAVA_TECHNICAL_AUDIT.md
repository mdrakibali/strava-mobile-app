# Strava-Inspired App — Technical Audit

**Audit date:** 2026-11-19
**Commit audited:** `1f954d8` (branch `main`, clean tree)
**Scope:** `mobile-frontend/` (Expo SDK 58, RN 0.88, Expo Router) and `mobile-backend/` (Hono on Cloudflare Workers, Drizzle ORM, Neon Postgres).
**Method:** I read the source line by line along the critical paths (recording, saving, feed, privacy, auth, social). I ran the available automated checks. Every finding cites file and line. Claims in the previous agent's status documents (`PROJECT_STATUS.md`, `FEATURE_GAP_AUDIT.md`, `FRONTEND_FEATURE_STATUS.md`) were **not** trusted. Where they contradict the code, the code wins (see §1.4).

Related documents:
- [STRAVA_PRODUCT_RESEARCH.md](STRAVA_PRODUCT_RESEARCH.md): how real Strava behaves
- [STRAVA_ARCHITECTURE_DECISIONS.md](STRAVA_ARCHITECTURE_DECISIONS.md): keep/replace verdicts per decision
- [STRAVA_FUNCTIONAL_GAP_ANALYSIS.md](STRAVA_FUNCTIONAL_GAP_ANALYSIS.md): feature-by-feature gap table
- [STRAVA_IMPLEMENTATION_PLAN.md](STRAVA_IMPLEMENTATION_PLAN.md): prioritized roadmap

---

## 0. Executive summary

The app **looks** complete (~55 screens) but is **not functional as a fitness tracker**. Its privacy model is **not enforced**. The core problems are structural, not cosmetic:

1. **Recording does not survive real-world use.** GPS uses foreground-only `watchPositionAsync`. Timers are `setInterval` counters. Nothing is persisted. Locking the screen, switching apps, or an OS kill stops or loses the activity. Android background location is not configured at all.
2. **Metrics are wrong in predictable ways.** Resuming after a pause adds a straight-line "teleport" distance. Elevation gain sums raw GPS altitude noise. Moving time keeps counting while stationary. Calories use three different made-up formulas in three places.
3. **Saving loses or corrupts data.** The selected visibility and start time are never sent to the server, so every activity is stored **PUBLIC** with the upload time as its start. If the upload fails, the recording is discarded anyway, even though a log line says "saved locally".
4. **Privacy is not enforced on the backend.** "Only You" activities show up in followers' feeds, in club feeds, and on public profile pages. The profile endpoint returns the **raw, unmasked GPS track** to unauthenticated callers. The GPX export endpoint is unauthenticated and returns raw coordinates. Profile and search responses expose other users' email addresses.
5. **Authentication has a production backdoor and committed secrets.** Any request with `idToken: "demo-google-token"` or `"mock:…"` logs in. The Neon database password is committed in 6 files and is in git history. Passwords are hashed with a single SHA-256 pass and a static salt.
6. **Many screens are façades.** Followers/Following lists show search results instead of real followers. The Follow button on the activity detail screen is local state only. The feed's "Following" filter always shows only your own activities. GPS settings are not persisted or used. The beacon toggle never starts a session. The activity detail screen reads response fields that do not exist, so its map, kudos and comments are always empty.

**Verdict:** Keep the platform choices (Expo + Expo Router, Hono on Workers, Drizzle + Neon, MapLibre). **Rewrite the recording engine and the activity/feed/privacy backend layer**, which is about 1,500 lines of the 15k. Fix auth and secrets immediately. Park the out-of-scope features (clubs, challenges, events, segments, routes, goals, messages, beacon, analytics) behind a feature flag rather than polishing them. A full rebuild is **not** justified: the navigation shell, UI components, schema foundation and service layering are reusable.

Finding counts: **Critical 15 · High 26 · Medium 22 · Low 7** (70 findings; index in §12).

---

## 1. What exists: inventory and how it actually works

### 1.1 Repository layout

| Path | Contents | Notes |
|---|---|---|
| `mobile-frontend/` | Expo SDK 58 app, Expo Router (`src/app/`), NativeWind 5 RC + Tailwind 4 | `dist/` contains a built Hermes bundle (ignored by `.gitignore`, present locally) |
| `mobile-backend/` | Hono app for Cloudflare Workers, Drizzle schema + 2 SQL migrations, seed scripts | Single Worker, `pg` driver via Hyperdrive |
| root `*.md` | Previous agent's status/gap documents | Contradicted by code in many places (§1.4) |

Size: ~8,900 lines of frontend TS/TSX, ~3,600 lines of backend TS, plus a 676-line unused mock file.

### 1.2 Frontend architecture as built

- **Navigation:** Expo Router stack in `src/app/_layout.tsx`, with a 5-tab group `(tabs)`. An auth guard in `NavigationRoot` redirects based on `isAuthenticated`. The record screen is a `fullScreenModal`. Save is a `modal`.
- **State:** a single `AppContext` (`src/context/AppContext.tsx`, 663 lines) holds **everything**: the auth user, the feed, clubs, challenges, events, segments, notifications, **and the live recording state** (via `useGpsRecorder`). No query/cache library. No persistence other than token + profile JSON in AsyncStorage.
- **Recording:** `src/hooks/use-gps-recorder.ts`. React state plus `setInterval(1000)` for time, and `Location.watchPositionAsync` for points. Covered in detail in §3.
- **API client:** `src/services/api.ts`. Hard-coded production URL, bare `fetch`, no timeout, no retry, no 401 handling. Responses are typed `any`.
- **Maps:** `src/components/map/StravaMapView.tsx` uses `@maplibre/maplibre-react-native` with CARTO GL styles in dev builds. In Expo Go it falls back to `LeafletMapView` (a WebView loading Leaflet from unpkg, using `tile.openstreetmap.org` and ArcGIS tiles).
- **Local DB:** none. **`expo-sqlite` is not installed.** Neither are `expo-task-manager` and `expo-secure-store`.
- **Android config (`app.json`):** permissions are only `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`. The `expo-location` plugin is configured only with `locationAlwaysAndWhenInUsePermission`, which per the Expo SDK 58 docs is **iOS-only**. `isAndroidBackgroundLocationEnabled` and `isAndroidForegroundServiceEnabled` are unset, so no `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE` or `FOREGROUND_SERVICE_LOCATION` are requested. The package id is the Expo placeholder `com.anonymous.mobilefrontend`. The app name is `mobile-frontend`.

### 1.3 Backend architecture as built

- **Runtime:** Hono app in `src/index.ts`, routes under `/api/v1`. There are two styles: controller → service → repository (activities, athletes, auth, feed, clubs, challenges, beacon, notifications, privacy zones), and fat route files with inline queries (routes, segments, events, goals, messages).
- **DB access:** `src/lib/db.ts` creates a **new `pg.Pool` (max 1) on every controller call**, through Hyperdrive if bound. `getDb` is called 45 times across the code.
- **Schema:** 21 tables in `src/db/schema.ts`. **Only one index** exists besides PKs and uniques: `kudos_unique_idx`. There is no index on `activities(athlete_id, start_time)`, `follows(following_id)`, `comments(activity_id)` or `notifications(recipient_id)`. PostGIS is **not** used, despite what the status docs say.
- **Auth:** HS256 JWT via `jose`, with a 30-day lifetime and no refresh or revocation. Google ID tokens are verified via JWKS. Email/password is supported.
- **Storage:** **no R2 binding** in `wrangler.jsonc`. "Photos" is a JSON array of URL strings. There is no upload endpoint.
- **Migrations:** `drizzle/0000`, `drizzle/0001`, applied by a hand-written `scripts/migrate.js` that contains the DB password.

### 1.4 Previous agent's claims vs. reality

| Claim (PROJECT_STATUS.md / FEATURE_GAP_AUDIT.md) | Reality in code |
|---|---|
| "background GPS" | Foreground-only `watchPositionAsync`. No task, no foreground service, no background permission. |
| "BLE sensors", "40+ sports" | No BLE library installed. Sport picker offers Run/Ride/Hike/Walk; Swim/Surf map to `Workout`. |
| "Neon PostgreSQL (PostGIS)" | No PostGIS extension or spatial column. Coordinates stored as JSONB. |
| "Strict backend coordinate clipping; zero coordinate leakage; row-level activity authorization" | Raw polyline leaks via the profile endpoint and the unauthenticated GPX export. No visibility check on detail, feed (following/clubs), kudos or comments. |
| "Hono (@hono/node-server)" | Cloudflare Workers runtime; `@hono/node-server` is not a dependency. |
| "Strict TypeScript" | `strict: true`, but 137 `any`/`as any` occurrences, including all API responses. |
| "Full CRUD comments, nested replies, @mention parsing" | Create only. No edit/delete. No mention parsing. |
| "Cloudflare R2" | Not configured. |

Treat these documents as **unreliable**. I recommend archiving them under `docs/archive/` once the new docs are adopted.

### 1.5 Checks run

| Check | Result | Notes |
|---|---|---|
| `mobile-backend: npx tsc --noEmit` | ✅ pass (0 errors) | Passes partly because request bodies are `any` |
| `mobile-frontend: npx tsc --noEmit` | ✅ pass (0 errors) | API responses are `any`, so contract mismatches (e.g. FE-03) are invisible to the compiler |
| `mobile-frontend: npx expo lint` | ❌ **no ESLint configured** | The command auto-installed ESLint and generated `eslint.config.js`. **I reverted these changes**, so the tree is unmodified. Note that `node_modules` now contains extra ESLint packages; `npm ci` restores it. |
| `npx expo-doctor` | ⚠️ 19/20 | `android.gradleProperties` is not a valid `app.json` key. It is silently ignored, so the Gradle memory settings do nothing. |
| Unit / integration / E2E tests | ❌ **none exist** | No Jest/Vitest config and no test files in either package |
| Device test of GPS/background | ⛔ **not performed** | No device or emulator available in this audit environment. Background behavior conclusions rest on code plus the Expo SDK 58 docs (`watchPositionAsync`: "Updates will only occur while the application is in the foreground"). Marked UNVERIFIED-ON-DEVICE where relevant. |
| Live API probing | ⛔ not performed | I did not send requests to the production Worker. The backdoor (SEC-02) was confirmed from code, not exploited. |

---

## 2. Severity scale

- **Critical**: data loss, privacy/security breach, or the core feature does not work. Must fix before any user testing.
- **High**: incorrect results or broken flows in priority features. Fix in the first implementation phase.
- **Medium**: degraded quality, performance, or maintainability. Fix during or after the core rebuild.
- **Low**: polish and hygiene.

Each finding uses this format: **Severity · Problem · Evidence · Affected files · Root cause · Recommended solution · Acceptance criteria · Testing**.

---

## 3. Findings: Security and secrets

### SEC-01 · Neon database credentials committed to git
- **Severity:** Critical
- **Problem:** The full Postgres connection string, including the `neondb_owner` password, is committed in source and present in git history since the first backend commit (`e904761`).
- **Evidence:** `mobile-backend/drizzle.config.ts:8`, `mobile-backend/scripts/migrate.js:10`, and also in `scripts/seed.js`, `scripts/seed-routes.js`, `scripts/clean-seed-data.js`, and `mobile-backend/.dev.vars` (tracked; `mobile-backend/.gitignore` ignores `.env` but not `.dev.vars`).
- **Affected files:** the 6 files above.
- **Root cause:** Credentials were inlined for convenience. `.dev.vars` was not git-ignored.
- **Recommended solution:** (1) **Rotate the Neon password now**, since the old one must be considered public. (2) Read `process.env.DATABASE_URL` in `drizzle.config.ts` and the scripts (dotenv is already a devDependency). (3) Add `.dev.vars` to `mobile-backend/.gitignore`, `git rm --cached` it, and commit a `.dev.vars.example`. (4) Set production secrets via `wrangler secret put`. (5) Optionally purge history (`git filter-repo`). Rotation is what actually matters; the purge is secondary.
- **Acceptance criteria:** `git grep -E "npg_|neondb_owner"` returns nothing. The old password no longer authenticates. A fresh clone plus `.dev.vars.example` documents the required variables.
- **Testing:** Run `git grep` in CI as a secret-scan step (or gitleaks). Manually verify the old connection string is rejected.

### SEC-02 · Authentication backdoor accepted in production
- **Severity:** Critical
- **Problem:** `verifyGoogleToken` returns a fixed demo identity for `idToken === 'demo-google-token'` **or any string starting with `mock:`**, with no environment check. `POST /auth/demo-login` is public. Anyone can obtain a valid session for the demo account and post, comment, follow or message as it.
- **Evidence:** `mobile-backend/src/lib/google-auth.ts:22`; `mobile-backend/src/routes/auth.route.ts:13`; `mobile-backend/src/services/auth.service.ts` (`loginWithDemo`). `wrangler.jsonc` sets `ENVIRONMENT: "production"`, but the code never checks it.
- **Affected files:** `src/lib/google-auth.ts`, `src/routes/auth.route.ts`, `src/services/auth.service.ts`, `mobile-frontend/src/context/AppContext.tsx` (`loginAsGuest`), `mobile-frontend/src/app/auth/login.tsx`.
- **Root cause:** Development shortcut left in the shared code path.
- **Recommended solution:** Remove the mock branch from `verifyGoogleToken`. Register `/auth/demo-login` only when `ENVIRONMENT !== 'production'` (Hono can mount conditionally inside a middleware). Remove the guest button from production builds via `EXPO_PUBLIC_ENABLE_DEMO`.
- **Acceptance criteria:** In the production environment, `POST /auth/google {idToken:"mock:x"}` → 401 and `POST /auth/demo-login` → 404.
- **Testing:** Backend integration tests (Vitest + Workers pool, or Hono `app.request`) covering both environments.

### SEC-03 · Weak password hashing
- **Severity:** Critical
- **Problem:** Passwords are hashed with a single SHA-256 pass and a hard-coded global salt (`password + 'open-strava-salt'`). That makes them fast to brute-force, and identical passwords produce identical hashes. Comparison is not constant-time.
- **Evidence:** `mobile-backend/src/lib/auth.ts:4-16`.
- **Affected files:** `src/lib/auth.ts`, `src/services/auth.service.ts`.
- **Root cause:** No KDF available in the Workers runtime without extra work.
- **Recommended solution:** Use **PBKDF2-SHA256 via WebCrypto** (`crypto.subtle.deriveBits`, available natively in Workers, so no dependency is needed), with a per-user random 16-byte salt and ≥100k iterations. Store `pbkdf2$iter$salt$hash`. Re-hash on next login for legacy hashes. **Alternatively, drop email/password and ship Google-only**, which the team appears to be converging on (see latest commits). That removes this whole surface.
- **Acceptance criteria:** No static salt in code. Stored hashes are unique for identical passwords. Legacy users can still log in once and are upgraded.
- **Testing:** Unit tests for hash/verify round trip, wrong password, and legacy upgrade.

### SEC-04 · JWT secret has a hard-coded fallback; `.dev.vars` secret committed
- **Severity:** Critical (conditional: UNVERIFIED whether production `JWT_SECRET` is set)
- **Problem:** If `JWT_SECRET` is missing, the middleware signs and verifies with the public literal `'open-strava-prod-secret-jwt-key-2026-auth'`. `wrangler.jsonc` does not declare `JWT_SECRET`, so it is either a dashboard secret (unverifiable from the repo) or absent. If production reuses the value in the committed `.dev.vars`, anyone can forge tokens for any user.
- **Evidence:** `mobile-backend/src/middleware/auth.ts:12,27`; `mobile-backend/.dev.vars` (tracked).
- **Affected files:** `src/middleware/auth.ts`, `src/controllers/auth.controller.ts`, `.dev.vars`.
- **Root cause:** Fallback for convenience.
- **Recommended solution:** Fail closed. Throw a 500 at startup or request time if `JWT_SECRET` is missing or shorter than 32 bytes. Rotate the production secret (this invalidates all sessions, which is acceptable). Add `iss`/`aud` claims and verify them.
- **Acceptance criteria:** No literal secret in code. A Worker without `JWT_SECRET` refuses auth. A token signed with the old `.dev.vars` secret is rejected in production.
- **Testing:** Middleware unit tests (missing secret, wrong secret, expired token).

### SEC-05 · Google login links accounts by email without checking `email_verified`; email/password accounts are not verified
- **Severity:** High
- **Problem:** `loginWithGoogle` links a Google identity to any existing account with the same email. Email/password registration never verifies email ownership. An attacker can register `victim@gmail.com` with a password first. When the victim later signs in with Google, the account is linked, and the attacker keeps password access (pre-account-takeover). `emailVerified` is parsed but never checked.
- **Evidence:** `mobile-backend/src/services/auth.service.ts:135` (link by email); `src/lib/google-auth.ts` (`emailVerified` returned, unused).
- **Affected files:** `src/services/auth.service.ts`, `src/lib/google-auth.ts`.
- **Root cause:** Two identity providers with no ownership proof on one of them.
- **Recommended solution:** Require `email_verified === true` from Google. Do **not** auto-link to password accounts with unverified email. Simplest route: go Google-only (see SEC-03).
- **Acceptance criteria:** A Google token with `email_verified=false` is rejected. Linking to a password account requires a verified email.
- **Testing:** Service unit tests with stubbed token payloads.

### SEC-06 · Google audience check silently disabled when `GOOGLE_CLIENT_ID` is missing
- **Severity:** Medium
- **Problem:** `audience: expectedClientId ? expectedClientId : undefined` means a missing env var accepts Google ID tokens minted for **any** OAuth client. It is currently set in `wrangler.jsonc`, but the code does not fail closed. Also, Android native sign-in (`@react-native-google-signin`) produces tokens whose `aud` is the **web** client ID passed as `webClientId`. That must match the backend list.
- **Evidence:** `mobile-backend/src/lib/google-auth.ts` (`jwtVerify` call).
- **Affected files:** `src/lib/google-auth.ts`, `wrangler.jsonc`.
- **Root cause:** Optional config.
- **Recommended solution:** Require a non-empty allowlist (`GOOGLE_CLIENT_IDS`, comma-separated) and pass it as `audience`.
- **Acceptance criteria:** A token with a foreign `aud` → 401. A missing config → 500 at auth time.
- **Testing:** Unit test with a locally signed JWT and a mocked JWKS.

### SEC-07 · Unauthenticated / mis-authorized mutation endpoints in out-of-scope modules
- **Severity:** High (data integrity), but the affected features are out of scope
- **Problem:** `goals.route.ts` reads `user?.id`, but the auth context field is `athleteId`, so `athleteId` is always undefined and **every goal is written to the first athlete in the table**. `DELETE /goals/:id` uses `optionalAuth` and deletes any goal by id with no ownership check. Other inline route files have similar patterns (not exhaustively audited because they are out of scope).
- **Evidence:** `mobile-backend/src/routes/goals.route.ts:16-19, 56-59, 108-116`.
- **Affected files:** `src/routes/goals.route.ts` (also review `routes.route.ts`, `segments.route.ts`, `events.route.ts`, `messages.route.ts`).
- **Root cause:** Inline route handlers outside the service layer; `any` casts hid the field-name error (`c.get('user' as any)`).
- **Recommended solution:** **Unmount out-of-scope routers in production** (see ADR-15) until they are needed. If they stay, use `requireAuth` and filter by `athleteId` on every mutation.
- **Acceptance criteria:** No mutation endpoint is reachable without auth. Mutations only affect rows owned by the caller.
- **Testing:** Generic authz test: for every mounted mutation route, an unauthenticated call returns 401.

### SEC-08 · Tokens stored in AsyncStorage
- **Severity:** Medium
- **Problem:** The 30-day bearer token is stored in plain AsyncStorage (unencrypted app storage).
- **Evidence:** `mobile-frontend/src/context/AppContext.tsx:228, 274, 305, 336, 367`.
- **Recommended solution:** Use `expo-secure-store` (Android Keystore-backed per Expo docs) for the token. The profile JSON can stay in SQLite or AsyncStorage.
- **Acceptance criteria:** No token in AsyncStorage. Logout deletes the SecureStore key.
- **Testing:** Manual check on device via `adb shell run-as` (debug build) to confirm the token is absent from AsyncStorage files.

### SEC-09 · CORS `*` and verbose error messages
- **Severity:** Low
- **Problem:** `CORS_ORIGIN: "*"`. Controllers return `err.message` directly (e.g. DB errors) in many 400/500 responses, bypassing the global handler's production masking.
- **Evidence:** `wrangler.jsonc` vars; e.g. `src/controllers/activity.controller.ts:76,94,121`.
- **Recommended solution:** CORS hardly matters for a native-only client, so restrict it or drop it. Map errors via typed `HttpError` classes and never echo raw DB messages.
- **Acceptance criteria:** No Postgres error text appears in API responses in production.
- **Testing:** Integration test that forces a DB error and asserts a generic message.

---

## 4. Findings: Backend privacy and authorization

### PRIV-01 · Activity detail ignores visibility
- **Severity:** Critical
- **Problem:** `GET /activities/:id` (optionalAuth) returns any activity, including `ONLY_ME` and `FOLLOWERS_ONLY`, to anyone who knows or guesses the id. Ids are `act_<ms timestamp>_<4 chars>`, which is enumerable. The masked polyline, all stats, comments and kudos are included.
- **Evidence:** `mobile-backend/src/services/activity.service.ts:123-149`. The only privacy logic is stripping `rawPolyline` for non-owners (line 140).
- **Affected files:** `src/services/activity.service.ts`, `src/controllers/activity.controller.ts`.
- **Root cause:** No central authorization policy.
- **Recommended solution:** Introduce `canViewActivity(viewerId, activity, isFollower)` in one module (`src/lib/policy.ts`) and use it in **every** read path: detail, feed, profile list, kudos, comments, export. Return **404** (not 403) for activities the viewer may not see, to avoid confirming existence. Switch ids to UUIDv7 or random UUIDs.
- **Acceptance criteria:** Matrix test: viewer ∈ {anonymous, stranger, follower, owner} × visibility ∈ {PUBLIC, FOLLOWERS_ONLY, ONLY_ME} → exact expected 200/404.
- **Testing:** Table-driven integration tests against a test database (Neon branch or local Postgres).

### PRIV-02 · Feed "following" and "clubs" tabs leak private activities
- **Severity:** Critical
- **Problem:** When `athleteIds` is set (following/clubs tabs), the repository applies **no visibility filter at all**, so followers see the author's `ONLY_ME` activities. The clubs tab shows `FOLLOWERS_ONLY` and `ONLY_ME` activities of all club members to all other members. And if `athleteIds` is ever an empty array with `publicOnly=false`, **no filter applies** and the query returns every activity in the database.
- **Evidence:** `mobile-backend/src/repositories/feed.repository.ts:26-30`; `src/services/feed.service.ts:31-47`.
- **Affected files:** `src/repositories/feed.repository.ts`, `src/services/feed.service.ts`.
- **Root cause:** Visibility filtering is only applied on the `publicOnly` branch.
- **Recommended solution:** Build the following-feed query as: `(athlete_id = me) OR (athlete_id IN followed AND visibility IN ('PUBLIC','FOLLOWERS_ONLY'))`, plus `exclude_from_feed = false` for others' posts. Drop the clubs tab (out of scope). Make "empty id list" return an empty result explicitly.
- **Acceptance criteria:** A follower never receives `ONLY_ME` activities of others. A non-follower never receives `FOLLOWERS_ONLY`. An empty follow list returns only own activities.
- **Testing:** Feed integration tests with three seeded users and all visibility combinations.

### PRIV-03 · Profile endpoint returns full activity rows including raw GPS, private activities and the athlete's email
- **Severity:** Critical
- **Problem:** `GET /athletes/:id` (optionalAuth, so anonymous callers work too) returns `recentActivities` as **full `activities` rows**: `rawPolyline` (unmasked, i.e. home location), `ONLY_ME` activities, everything. The athlete object is the full row minus `passwordHash`, so it includes `email`, `googleId`, weight, height and HR settings.
- **Evidence:** `mobile-backend/src/controllers/athlete.controller.ts:50-56`; `src/repositories/athlete.repository.ts` (`getRecentActivities` selects `*`, with no visibility filter).
- **Affected files:** `src/controllers/athlete.controller.ts`, `src/repositories/athlete.repository.ts`.
- **Root cause:** Selecting whole rows and blacklisting one field, instead of whitelisting public fields.
- **Recommended solution:** Define explicit DTOs: `PublicAthleteDTO` (id, username, displayName, avatarUrl, city, country, bio, counts, followState) and `ActivitySummaryDTO` (no raw polyline; masked/simplified polyline only). Filter activities with `canViewActivity`. Move to a dedicated paginated `GET /athletes/:id/activities`.
- **Acceptance criteria:** No API response ever contains another user's `email`, `googleId`, `rawPolyline`, weight or HR settings. Anonymous callers see only PUBLIC activities.
- **Testing:** Snapshot/contract tests asserting the JSON keys of every public endpoint, plus the PRIV-01 visibility matrix.

### PRIV-04 · GPX export is unauthenticated and returns the raw track
- **Severity:** Critical
- **Problem:** `GET /activities/:id/export` has **no auth middleware** and serializes `rawPolyline` (falling back to masked) for any activity id. Privacy zones are completely bypassed. It also interpolates the user-controlled `title` into XML without escaping (XML injection / malformed file).
- **Evidence:** `mobile-backend/src/routes/activities.route.ts:13`; `src/services/activity.service.ts:193-218`.
- **Affected files:** same.
- **Recommended solution:** Restrict export to the owner only (engineering recommendation: the raw track is exactly what privacy zones and hide-start/end exist to protect). Escape XML. Or remove the endpoint (export is not a priority feature).
- **Acceptance criteria:** A non-owner gets 404. A title with `<&>` produces valid XML.
- **Testing:** Integration tests, plus an XML parse test.

### PRIV-05 · Athlete search exposes PII and enumerates all users
- **Severity:** High
- **Problem:** `GET /athletes/search` (optionalAuth) returns full athlete rows minus the password hash, including `email` and `googleId`. An empty `q` returns the first 20 users. Anonymous callers can scrape the user base.
- **Evidence:** `mobile-backend/src/controllers/athlete.controller.ts:20-29`; `src/repositories/athlete.repository.ts` (`search`).
- **Recommended solution:** Use `PublicAthleteDTO`, `requireAuth`, a minimum query length of 2, and a rate limit (Cloudflare rate-limiting rules or a simple KV/DO counter).
- **Acceptance criteria:** The response contains no email/googleId. Anonymous → 401.
- **Testing:** Contract test on response keys.

### PRIV-06 · Kudos and comments allowed on activities the user cannot see; kudos on own activity allowed
- **Severity:** High
- **Problem:** `toggleKudos` and `addComment` only check that the activity exists. Any authenticated user can kudo or comment on `ONLY_ME`/`FOLLOWERS_ONLY` activities (and thereby confirm their existence). Users can kudo their own activity. Strava's official docs do not state a rule here (research doc §14 lists it as unconfirmed), but kudos on your own work is meaningless in the UI, so we recommend blocking it.
- **Evidence:** `mobile-backend/src/services/activity.service.ts:152-191`.
- **Recommended solution:** Apply `canViewActivity` first and reject self-kudos.
- **Acceptance criteria:** Kudo/comment on an invisible activity → 404. Self-kudo → 400.
- **Testing:** Integration tests.

### PRIV-07 · Privacy-zone masking is point-dropping only and is computed only at upload time
- **Severity:** Medium
- **Problem:** Masking removes points inside zones. That is acceptable as a baseline, but: (a) zones added later do not re-mask existing activities; (b) the drop leaves a visible gap whose edge reveals the zone circle; (c) there is no "hide start/end" default, which is how Strava's current "Map Visibility" works (research doc §15).
- **Evidence:** `mobile-backend/src/lib/privacy.ts`; `src/services/activity.service.ts:44-45`.
- **Recommended solution:** For MVP, add a **per-user "hide start/end N meters" setting (default 200 m)** applied to the masked polyline, and compute masking **at read time** or re-mask on zone change. Keep privacy zones as an optional extra.
- **Acceptance criteria:** The first and last N meters are never returned to non-owners. Changing zones re-masks existing activities.
- **Testing:** Unit tests on the masking function with synthetic tracks.

---

## 5. Findings: GPS recording engine (frontend)

### GPS-01 · No background location: recording stops when the screen locks or the app is backgrounded
- **Severity:** Critical
- **Problem:** Location comes from `Location.watchPositionAsync`. Per Expo SDK 58 docs: *"Updates will only occur while the application is in the foreground. To get location updates while in background you'll need to use `startLocationUpdatesAsync`."* There is no `TaskManager.defineTask`, no `startLocationUpdatesAsync`, no foreground service and no background permission request. `app.json` does not enable `isAndroidBackgroundLocationEnabled` / `isAndroidForegroundServiceEnabled`, and its only plugin option (`locationAlwaysAndWhenInUsePermission`) is iOS-only. The 1 Hz `setInterval` that drives the clock is also suspended when JS is paused. A real run with the phone in a pocket therefore records almost nothing after the screen turns off.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:175, 224`; `mobile-frontend/app.json` (`android.permissions`, `plugins`). `expo-task-manager` is not in `package.json`.
- **Affected files:** `src/hooks/use-gps-recorder.ts`, `app.json`, `package.json`, new `src/tasks/location-task.ts`.
- **Root cause:** The recorder was built for an emulator/demo, not a device in a pocket.
- **Recommended solution:** See ADR-03. Use `expo-task-manager` + `Location.startLocationUpdatesAsync(TASK, { accuracy: BestForNavigation, timeInterval: 1000, distanceInterval: 0, foregroundService: { notificationTitle, notificationBody, killServiceOnDestroy: false } })`, with the task defined in global scope (`src/tasks/location-task.ts`, imported at the top of `app/_layout.tsx` per the Expo Router guidance in the TaskManager docs). Enable `isAndroidBackgroundLocationEnabled: true` in the `expo-location` plugin, which also enables `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION` by default. Request foreground permission first, then background (on Android 11+ this opens Settings, so show a rationale screen first). The task writes points straight to SQLite (GPS-07). The UI reads from the DB and an in-memory event bus. This **requires a development build**: Expo Go on Android supports neither TaskManager nor foreground services.
- **Acceptance criteria:** On a physical Android 12+ device: start a 20-minute walk, lock the screen after 1 minute, and unlock at the end. The track is continuous (no gap > 10 s) and time and distance are within 3% of a reference (another GPS app or a measured route). A persistent notification is visible while recording.
- **Testing:** Manual device test protocol (see the implementation plan, Test Protocol T-1) on at least 2 OEMs (Pixel + Samsung/Xiaomi, which are known for aggressive battery killing). Unit tests for the task handler with injected location batches.

### GPS-02 · Elapsed and moving time are tick counters, not clocks
- **Severity:** Critical
- **Problem:** `elapsedSeconds` is `+1` per `setInterval` tick. Ticks are delayed under load and stop entirely while JS is suspended, so elapsed time drifts and then freezes in the background. Moving time is also `+1` per tick if the *last known* speed ≥ 0.8 m/s. Because `distanceInterval: 1` suppresses updates while stationary, the last speed stays high and **moving time keeps counting while the user stands still**.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:85-170` (especially line 92).
- **Root cause:** Time derived from render ticks instead of timestamps.
- **Recommended solution:** Elapsed = `now − startedAt − Σ(manual pause intervals)`, computed from wall-clock timestamps stored in the session row. Moving time = Σ over consecutive accepted point pairs of `Δt` where segment speed ≥ the sport threshold and `Δt` ≤ a gap cap (e.g. 10 s, so a long signal gap is not counted as moving). The UI timer only *displays* `now − startedAt`; it never accumulates.
- **Acceptance criteria:** After backgrounding for 5 minutes, elapsed time on return equals the wall-clock difference ±1 s. Standing still for 60 s adds 0 s of moving time (±2 s).
- **Testing:** Pure-function unit tests (`computeMovingTime(points, sport)`) with synthetic tracks: constant pace, stop-and-go, signal gap.

### GPS-03 · Resume after pause adds a "teleport" distance
- **Severity:** Critical
- **Problem:** While paused, incoming fixes are ignored (`if (prev.isPaused) return prev`), but `lastCoordRef` is **not reset**. On resume, the first new fix is measured against the last pre-pause point and the whole straight-line distance is added. Walk 500 m while paused and resume: +500 m is credited.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:235` together with `lastCoordRef` usage at `248-275`; `resumeRecording` (`361-363`) does not reset it.
- **Root cause:** Pause is modelled as "ignore updates" rather than as a segment break.
- **Recommended solution:** Model the track as **segments** (laps of continuous recording). Pause closes the current segment and resume opens a new one. Distance is only summed within a segment. (GPX `<trkseg>` maps 1:1.)
- **Acceptance criteria:** Pause, move 200 m, resume: total distance does not increase by the paused movement (±5 m).
- **Testing:** Unit test with a synthetic track containing a pause marker. Device test.

### GPS-04 · Weak point filtering lets GPS drift inflate distance
- **Severity:** High
- **Problem:** Filtering is: reject `accuracy > 30 m`, and add any segment ≥ 0.8 m. When stationary with 5–15 m accuracy, fixes wander several metres each second, and every jitter ≥ 0.8 m is added (distance "creeps" at traffic lights or while tying shoes). There is no speed-plausibility check (a 200 m jump in 1 s is accepted if accuracy ≤ 30) and no check for stale or out-of-order timestamps. The initial `getCurrentPositionAsync` fix (possibly cached or coarse) becomes the start point without an accuracy check.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:194-221, 241-259`.
- **Root cause:** Minimal heuristics.
- **Recommended solution:** In a pure `TrackFilter` module: (1) drop fixes with `accuracy > 20 m` (configurable; keep them for display only); (2) drop fixes whose implied speed > sport max (Run 12 m/s, Ride 30 m/s, Walk/Hike 4 m/s) or whose timestamp ≤ the previous one; (3) **stationary gating**: only add segment distance when `distance > max(accuracy_prev, accuracy_cur) * 0.5` *or* Doppler speed > the moving threshold; (4) wait for the first fix with accuracy ≤ 20 m before allowing Start (show "Acquiring GPS"); (5) optionally a 1-D Kalman or 3-point median smoothing on lat/lng. Keep **raw** points in the DB and apply filters when computing metrics, so the algorithm can be improved later without losing data.
- **Acceptance criteria:** Phone stationary on a table for 5 minutes during recording: distance ≤ 20 m. 1 km measured track walked: error ≤ 3%.
- **Testing:** Unit tests with recorded fixture tracks (collect real GPX/JSON traces from devices during Phase 1 and commit them as fixtures). Device protocol.

### GPS-05 · Auto-pause is always on, hard-coded, without hysteresis, and does not stop distance
- **Severity:** High
- **Problem:** `isAutoPaused = speed < 0.8` on every fix: one sample flips it. A slow uphill hike (< 2.9 km/h) is treated as paused. While "auto-paused", distance is still added (only the moving-time tick checks the flag). There is no user setting; the GPS settings screen toggle is not wired (FE-07). Strava makes auto-pause a user setting (off / runs / rides). It is **on by default for rides** (GPS-based) and uses the accelerometer for runs. Strava's own support advice is to turn it **off for walks and hikes** because slow speeds cause false pauses (research doc §8).
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:278`; `src/app/settings/gps.tsx:10` (local state only).
- **Recommended solution:** Auto-pause becomes a per-user, per-sport setting. Defaults: **Ride on; Run, Walk and Hike off**. GPS-speed based for all sports in MVP; an accelerometer-based run detector is a later enhancement. When on, use sport-specific thresholds with hysteresis: pause after speed < threshold for ≥ 3–5 s, resume after > threshold for ≥ 2 s. Auto-pause affects the *displayed timer and moving time* only; the raw track continues. Moving time is computed independently of auto-pause (GPS-02), so the summary is correct either way.
- **Acceptance criteria:** With auto-pause off, the timer never stops on its own. With it on, a 30 s stop shows a "Paused" banner within 5 s and resumes within 3 s of moving.
- **Testing:** Unit tests for the state machine with synthetic speed series.

### GPS-06 · Elevation gain sums raw GPS altitude noise
- **Severity:** High
- **Problem:** Every positive delta > 0.6 m between consecutive fixes is added (`Math.round`). GPS altitude noise is typically several metres per fix, so on a flat route this accumulates tens to hundreds of metres of fake climbing per hour. Android `coords.altitude` is height above the **WGS-84 ellipsoid**, not sea level (Expo SDK 58 docs), so displayed absolute altitude can be off by tens of metres depending on the geoid. Per-split elevation is just the last single delta.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:261-267, 302`.
- **Recommended solution:** Compute gain post-hoc from the stored altitude series. Filter fixes with `altitudeAccuracy` > 10 m, apply a moving average (~10–15 s window) or a distance-based resample (every 10 m), then count gain with a **hysteresis threshold**: only commit a climb once the smoothed altitude has risen consistently by more than the threshold from the last trough. Strava documents a **> 10 m** consistency threshold for activities without barometric data (research doc §6), and phone GPS is exactly that case, so start at 10 m and tune against fixtures. The live display may show the same algorithm applied incrementally. Optional later: server-side DEM correction (Strava's "corrected elevation" for app recordings cross-references an elevation basemap; research doc §6). That needs a DEM source and is out of MVP scope.
- **Acceptance criteria:** A 30-minute flat-route recording reports ≤ 15 m gain. A known hill (from a map's DEM profile) is within ±25%.
- **Testing:** Unit tests with synthetic noisy altitude (sine hill + Gaussian noise), and device fixtures.

### GPS-07 · Recording state lives only in React memory: no crash/kill recovery
- **Severity:** Critical
- **Problem:** The whole session (points, time, splits) lives in `useState` inside `AppContext`. If Android kills the app (common under memory pressure, or by OEM battery managers), or JS throws, the activity is gone. On next launch there is no "Resume / Save / Discard recovered activity" prompt. Strava's official docs do not describe its crash-recovery behavior (research doc §9, unconfirmed), so this is an engineering requirement rather than a parity claim: a fitness recorder that loses a 2-hour hike on a crash is unacceptable. Each GPS update also copies the entire point array (`[...prev.routeCoordinates, newCoord]`), which is O(n) per update, so a 2-hour activity (~7,200 points) means a ~26 M element copy churn and garbage-collection pressure.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:77, 148, 318`; `src/context/AppContext.tsx:45-53`.
- **Recommended solution:** See ADR-05. Add an `expo-sqlite` **recording journal**: table `recording_session` (id = client UUID, sport, state, started_at, paused intervals, settings snapshot) and `recording_point` (session_id, seq, ts, lat, lng, alt, accuracy, alt_accuracy, speed, segment_idx). The background task appends points in batches inside a transaction. Live UI metrics are derived incrementally from an in-memory accumulator that is rebuilt from the DB on cold start. On app start, if a session is `recording` or `paused`, show a recovery screen.
- **Acceptance criteria:** Force-stop the app (`adb shell am force-stop`) mid-activity, then relaunch: a recovery prompt appears, and all points up to the kill (within the last batch, ≤ 5 s) are present. Note: per Expo docs, *"Background location will stop if the user terminates the app"*. Recovery restores what was recorded; it cannot record while killed.
- **Testing:** Device test with force-stop. Unit tests on the repository layer (SQLite can run under Jest via a node adapter or by mocking).

### GPS-08 · Splits are inaccurate and contain fabricated heart rate
- **Severity:** High
- **Problem:** Split time uses `prev.movingSeconds` at the first fix *after* crossing the km boundary (no interpolation). `distanceKm` is hard-coded `1.0`. `elevationDeltaMeters` is the single last delta. `averageHeartRate` is `prev.currentHeartRate || 154`, i.e. **154 bpm is invented** when no sensor exists. Splits are always per km (no miles/units setting).
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:290-305`.
- **Recommended solution:** Compute splits post-hoc from the filtered track: interpolate the exact crossing timestamp, per-split moving time, elevation delta and average speed, plus a final partial split. Never emit HR without a sensor.
- **Acceptance criteria:** No HR field when no sensor. The sum of split times equals the total moving time ±1 s. The last partial split is present.
- **Testing:** Unit tests with synthetic tracks.

### GPS-09 · Simulation mode and fake heart rate reachable in production
- **Severity:** Medium
- **Problem:** The record settings modal exposes a "simulation" toggle that generates a fake route around Dhaka with random HR 144–164. Activities recorded this way can be saved and published as real.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:95-154, 383-389`; `src/components/record/RecordSettingsModal.tsx`.
- **Recommended solution:** Remove it from the recorder. For development, replace it with **replay of fixture tracks** through the same pipeline, gated behind `__DEV__`.
- **Acceptance criteria:** Release builds cannot produce simulated activities.
- **Testing:** Build-flag check, plus a dev replay used in automated tests.

### GPS-10 · Recording starts before a GPS fix and continues after permission denial
- **Severity:** High
- **Problem:** `startRecording` sets `isRecording: true` immediately, then calls `startGpsSubscription()` without awaiting it. If permission is denied or GPS is disabled, an alert shows but the timer keeps running with zero points.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:330-355`; `src/app/record.tsx:284`.
- **Recommended solution:** The record screen has a pre-start state: check permissions (fine + background with rationale), check location services, and show live GPS accuracy. The Start button is enabled once a fix ≤ 20 m arrives, with a "Start anyway" option. Strava shows a GPS-acquired indicator before start (research doc §3).
- **Acceptance criteria:** With permission denied, Start leads to the permission flow and no session row is created.
- **Testing:** Component test with a mocked `expo-location`.

### GPS-11 · Speed fallback assumes 1-second intervals; max speed taken from raw spikes
- **Severity:** Medium
- **Problem:** When Doppler `speed` is null, it falls back to `addedDistance` (metres) as m/s, which is wrong whenever Δt ≠ 1 s. `maxSpeedMps` is the maximum of raw per-fix speeds, which picks up spikes.
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:277, 314`.
- **Recommended solution:** Use Doppler speed when present, else `distance/Δt`. Compute max speed from a smoothed series (e.g. 5-sample rolling median).
- **Acceptance criteria:** Max speed in a walk test ≤ 2.5 m/s.
- **Testing:** Unit tests.

---

## 6. Findings: Metrics, display and calories

### MET-01 · Calories: three different invented formulas
- **Severity:** High
- **Problem:** Live screen: `65 kcal/km + 4 kcal/min` (any sport) (`record.tsx:107`). Server default: `distance × 0.06` = 60 kcal/km (`activity.service.ts:78`). Detail fallback: `65 kcal/km` (`activity/[id].tsx`). None use body weight or sport. A 20 km ride is credited as a 20 km run. The client never sends calories, so the server formula always wins and does not match what the user saw live. Body weight defaults to an **invented 68 kg** for every new user (`auth.service.ts:41,167`).
- **Recommended solution:** One shared pure function (`packages/metrics` or a duplicated small module) using the **MET method**: `kcal = MET(sport, speed) × weightKg × hours(moving)`. MET values come from the Compendium of Physical Activities (running and cycling MET depend on speed; walking ≈ 3.5, hiking ≈ 6.0). If the user has no weight, use a documented default (e.g. 70 kg) and **label the value as an estimate**. Compute it once on the client at finish, and recompute on the server for validation. Do not fabricate profile values at sign-up; store `null` and prompt in onboarding. (Strava's own calorie method is described in research doc §7; ours is an engineering approximation, not a claim of parity.)
- **Acceptance criteria:** The same activity shows identical calories live (at finish), on the save screen, in detail, and in the feed. Ride kcal/km < Run kcal/km for typical speeds. Changing weight changes calories proportionally.
- **Testing:** Unit tests per sport with reference values from the Compendium.

### MET-02 · Recording screen shows moving time as "TIME" and average pace labelled as current pace
- **Severity:** Medium
- **Problem:** The big timer displays `movingSeconds` (which is itself wrong; see GPS-02). The pace labelled "PACE (/KM)" is the **average** pace (`movingSeconds/distance`). There is no current/split pace for runs. Ride shows *current* speed (inconsistent). Distance is km only.
- **Evidence:** `mobile-frontend/src/app/record.tsx:94-105, 185`.
- **Recommended solution:** Follow Strava's documented recording display (research doc §3/§5). Runs show **split average pace**. Rides show **current speed while moving and average speed while paused**. Both show Time and Distance. For runs/walks/hikes show pace; for rides show speed (sport config table). Add a units preference (metric/imperial).
- **Acceptance criteria:** Labels match the values shown. The sport → pace/speed mapping is driven by one config table.
- **Testing:** Component tests on formatting helpers.

### MET-03 · Fabricated defaults displayed as real data across the UI
- **Severity:** High
- **Problem:** Mappers invent values when fields are missing: `followersCount: 142`, `followingCount: 98`, `averageHeartRate: 150`, `maxHeartRate: 175`, `relativeEffortScore: 45`, `averageSpeedMps: 3.0`, `maxSpeedMps: 4.5`, city `Dhaka`/`Manhattan`, bio `"Runner & Cyclist"`. On save, `maxSpeedMps = current × 1.3` and `maxHeartRate = current + 12`. The server invents a "relative effort" score and a "GAP" that is just average pace (not grade-adjusted).
- **Evidence:** `mobile-frontend/src/context/AppContext.tsx:79-104, 560-569`; `src/app/activity/[id].tsx:66-93`; `mobile-backend/src/services/activity.service.ts:47-57`.
- **Recommended solution:** Never invent metrics. Display "—" for absent data. Remove relative effort and GAP (out of scope; Strava gates them behind a subscription). Typed DTOs make missing fields explicit.
- **Acceptance criteria:** `grep` for the literal defaults above returns nothing in the mappers. An activity without HR shows no HR card.
- **Testing:** Mapper unit tests.

### MET-04 · Number and unit formatting duplicated in ≥4 places, inconsistently
- **Severity:** Medium
- **Problem:** Pace/time formatting logic is copy-pasted in `AppContext.mapBackendActivity`, `saveNewActivity`, `activity/[id].tsx`, `record.tsx` and `use-gps-recorder.ts`, with differences (e.g. `mm:ss` that never shows hours, so a 1h05 run displays "65:00"; default pace "5:00" when distance is 0).
- **Recommended solution:** One `src/lib/format.ts` (duration `h:mm:ss`, pace, speed, distance, elevation, units) with unit tests.
- **Acceptance criteria:** One implementation, imported everywhere.
- **Testing:** Unit tests including edge cases (0 distance, > 1 h, > 24 h).

---

## 7. Findings: Activity lifecycle, saving and sync

### SYNC-01 · Visibility, start time, speeds and calories are not sent on save, so every activity is stored PUBLIC
- **Severity:** Critical
- **Problem:** `saveNewActivity` builds the request without `visibility`, `startTime`, `averageSpeedMps`, `maxSpeedMps` or `calories`. The server defaults are `visibility = 'PUBLIC'` and `startTime = new Date()` (the upload moment). **A user who chooses "Only You" publishes the activity to everyone**, and every activity's date/time is wrong by its duration (or more, for delayed uploads).
- **Evidence:** `mobile-frontend/src/context/AppContext.tsx:584-595`; `mobile-backend/src/services/activity.service.ts:68-69`.
- **Recommended solution:** Typed `CreateActivityRequest` shared between client and server (a `shared/` TS package, or zod schemas duplicated with a contract test). Send `startTime` (from session start), `visibility`, and the client-computed summary. The server validates.
- **Acceptance criteria:** An activity saved as ONLY_ME has `visibility = 'ONLY_ME'` in the DB. `start_time` equals the session start ±1 s.
- **Testing:** E2E: save with each visibility, then query the DB/API. Contract test on the request schema.

### SYNC-02 · Upload failure discards the recording (silent data loss)
- **Severity:** Critical
- **Problem:** On any network or server error, the catch block logs "Background activity upload to Neon failed (saved locally)", but nothing is saved locally. Then `discardRecording()` runs unconditionally. The save screen shows no error (no throw) and navigates home. The optimistic feed item disappears on next refresh. **Recording a run without signal (a common case on trails, which is exactly the hiking use case) loses it.**
- **Evidence:** `mobile-frontend/src/context/AppContext.tsx:605-609`; `src/app/save-activity.tsx:33-43`.
- **Recommended solution:** See ADR-06: **offline-first outbox**. On Save, finalize the session in SQLite (status `pending_upload`, with the user's title, visibility and sport), then navigate immediately. A sync worker uploads with retry/backoff on app foreground, on connectivity change, and on manual "retry". The local activity appears in the user's own list with a "Waiting to upload" badge. The local record is deleted only after a 2xx response. Strava has the same model: activities save locally and upload when connectivity returns (research doc §9).
- **Acceptance criteria:** Airplane mode → record → save: the activity appears in the profile list as pending. Disable airplane mode: it uploads within 30 s of foreground and appears exactly once on the server.
- **Testing:** Device test. Unit tests on the outbox state machine with a mocked fetch (fail, timeout, 5xx, 4xx validation error leading to a "needs attention" state rather than infinite retries).

### SYNC-03 · No idempotency: retries or double taps create duplicates
- **Severity:** High
- **Problem:** The server generates `act_<Date.now()>_<rand>` per request. Nothing ties a request to a recording session. A retry after a timeout (request succeeded, response lost) creates a duplicate. The save button disables during save, but the planned outbox retries would duplicate.
- **Evidence:** `mobile-backend/src/services/activity.service.ts:59`; schema `activities` has no client id column.
- **Recommended solution:** The client generates a UUID per recording session (`client_activity_id`). Add a column with `UNIQUE (athlete_id, client_activity_id)`. `POST /activities` does `INSERT … ON CONFLICT DO NOTHING RETURNING`, and on conflict returns the existing row with **200** (vs 201 when created). This mirrors Strava's upload `external_id` concept (research doc §16).
- **Acceptance criteria:** Posting the same payload twice yields one row. The second response has the same activity id.
- **Testing:** Integration test, including concurrent requests.

### SYNC-04 · No server-side validation of activity payloads
- **Severity:** High
- **Problem:** Only `title` is checked. `sportType` and `visibility` are free strings (any value is stored; an unknown visibility like `"FRIENDS"` would be excluded from public feeds but included in following feeds). Negative or `NaN` distances, `movingTime > elapsedTime`, multi-MB polylines and future start dates are all accepted. `decimal(6,2)` speeds overflow above 9,999 and throw a 500.
- **Evidence:** `mobile-backend/src/controllers/activity.controller.ts:24-38`; schema `src/db/schema.ts` (varchar columns, no CHECK constraints).
- **Recommended solution:** zod schema (`@hono/zod-validator`, a small justified dependency) or hand-written validation: sport ∈ enum {Run, Walk, Hike, Ride}, visibility ∈ enum, 0 ≤ distance ≤ 1,000 km, 0 ≤ moving ≤ elapsed ≤ 48 h, start not in the future (+5 min skew), ≤ 50k points, title ≤ 100 chars. Add Postgres CHECK constraints or enums for visibility and sport. The server **recomputes** distance/time from the polyline and rejects inconsistencies > 5% (cheap and prevents tampering).
- **Acceptance criteria:** Invalid payloads return 400 with a field-level error. No 500 from overflows.
- **Testing:** Table-driven validation tests.

### SYNC-05 · Edit and delete of activities are not exposed
- **Severity:** High
- **Problem:** The repository has `update`/`delete`, but no routes exist. Users cannot change title, visibility or sport after saving, and cannot delete. Both are basic Strava functions (research doc §10).
- **Evidence:** `mobile-backend/src/routes/activities.route.ts` (only POST/GET/kudos/comments/export).
- **Recommended solution:** `PATCH /activities/:id` (owner only; title, description, sport, visibility, hideFromFeed) and `DELETE /activities/:id` (owner only, cascades). The client gets an edit screen that reuses the save form.
- **Acceptance criteria:** The owner can edit and delete. Non-owners get 404.
- **Testing:** Integration tests.

### SYNC-06 · Save screen ignores the sport change, tag, perceived exertion and private notes; photos button is fake
- **Severity:** High
- **Problem:** `saveNewActivity(title, description, visibility)` is called, so the `sport` state chosen on the save screen is **discarded** (the recording's sport is used). Activity tag, perceived exertion and private notes are collected and thrown away. "Add Photos" shows an alert claiming photos are "synced directly to your cloud workout gallery", which is false. The default title is the bare sport (`"Run"`) rather than Strava's time-of-day naming ("Morning Run", research doc §3).
- **Evidence:** `mobile-frontend/src/app/save-activity.tsx:21-43, 89-96`.
- **Recommended solution:** Pass a full `SaveActivityInput`. Either persist the extra fields (add `perceived_exertion smallint`, `private_note text`, `workout_type` columns) or remove them from the UI for MVP. Remove the photo button until R2 upload exists (ADR-10). Generate the default title from local start hour + sport.
- **Acceptance criteria:** Every control on the save screen affects the stored activity, or it is not shown.
- **Testing:** E2E: change the sport to Hike on the save screen, then the detail screen shows Hike.

### SYNC-07 · Finish → Back → Start wipes an unsaved activity
- **Severity:** High
- **Problem:** `finishRecording` sets `isRecording: false` and the save screen is a dismissible modal. If the user goes back to the record screen it shows **START**, and pressing it calls `startRecording`, which resets state to `INITIAL_RECORDING_STATE` and destroys the finished, unsaved activity. Android hardware back is not intercepted on the record screen (only the header back button shows a confirm).
- **Evidence:** `mobile-frontend/src/hooks/use-gps-recorder.ts:330-341, 373-381`; `src/app/record.tsx:117-138`.
- **Recommended solution:** Use an explicit session state machine persisted in SQLite: `idle → acquiring → recording ⇄ paused → finished(unsaved) → saved(pending_upload) → uploaded | discarded`. Starting a new session is impossible while one is in `recording | paused | finished`. Use `BackHandler`/`usePreventRemove` on record and save. Discard requires confirmation.
- **Acceptance criteria:** No UI path loses a finished activity without an explicit "Discard" confirmation.
- **Testing:** State machine unit tests (all transitions; invalid ones throw). Manual navigation tests.

### SYNC-08 · Whole-app re-render every second during recording
- **Severity:** Medium
- **Problem:** The recording state is part of the single `AppContext` value, so every 1 Hz tick and every GPS fix re-renders **every** consumer (feed, profile, tabs, maps) mounted under the stack.
- **Evidence:** `mobile-frontend/src/context/AppContext.tsx:45-53, 614-651`.
- **Recommended solution:** Move recording into its own store (Zustand, ~1 KB; or `useSyncExternalStore` over a tiny module-level store, with no dependency) with selector subscriptions. Only the record screen subscribes to per-second values.
- **Acceptance criteria:** The React DevTools profiler shows that only record-screen components re-render per tick.
- **Testing:** Profiler check (manual).

---

## 8. Findings: Backend API, data model and infrastructure

### API-01 · New Postgres pool created per request handler
- **Severity:** High
- **Problem:** `getDb()` constructs `new Pool({ max: 1 })` on every controller call, and it is never ended. Some requests call `getDb` twice (e.g. `athlete.controller.ts` follow path). Through Hyperdrive this is tolerable for connection setup, but leaked pools hold sockets until the isolate dies, and without Hyperdrive (`DATABASE_URL` fallback) each request opens fresh TLS connections to Neon.
- **Evidence:** `mobile-backend/src/lib/db.ts:9-22`; 45 `getDb` call sites.
- **Recommended solution:** Create the DB once per request in a Hono middleware (`c.set('db', …)`) and close or release it at the end (`c.executionCtx.waitUntil(pool.end())`), or use `pg.Client` per request via Hyperdrive, which is Cloudflare's documented pattern. Alternatively, use Neon's serverless HTTP driver (`drizzle-orm/neon-http`; already a dependency, `@neondatabase/serverless`) for simple queries. Choose **one** driver and document it (ADR-08).
- **Acceptance criteria:** One connection per request at most. No unhandled-promise or socket warnings in `wrangler tail`.
- **Testing:** Load test with ~50 concurrent requests (k6 or autocannon) against staging; observe errors and latency.

### API-02 · Missing indexes for every hot query
- **Severity:** High (latency grows linearly with data)
- **Problem:** The feed filters by `athlete_id IN (…)` and orders by `start_time`. The profile lists by athlete. Followers counts scan `follows` by `following_id`. Comments and kudos counts scan by `activity_id` (only kudos has a composite unique). Notifications scan by recipient. None of these have indexes.
- **Evidence:** `mobile-backend/drizzle/0000_amazing_hex.sql` (only `kudos_unique_idx`).
- **Recommended solution:** Add `activities(athlete_id, start_time DESC, id DESC)`, `activities(visibility, start_time DESC) WHERE NOT exclude_from_feed`, `follows(following_id)`, `comments(activity_id, created_at)`, `notifications(recipient_id, created_at DESC)`, and `activities(athlete_id, client_activity_id) UNIQUE`.
- **Acceptance criteria:** `EXPLAIN` for the feed and profile queries shows index scans with 10k seeded activities.
- **Testing:** A seed script plus `EXPLAIN ANALYZE` captured in the PR.

### API-03 · Cursor pagination can skip or duplicate items
- **Severity:** Medium
- **Problem:** The cursor encodes `(startTime, id)`, but the WHERE clause only uses `start_time < cursor.timestamp`. Items sharing the boundary timestamp are skipped. Profile listing (`listByAthlete`) has the same problem.
- **Evidence:** `mobile-backend/src/repositories/feed.repository.ts:22-24`; `src/repositories/activity.repository.ts` (`listByAthlete`).
- **Recommended solution:** Row-value comparison: `(start_time, id) < (:ts, :id)`.
- **Acceptance criteria:** Paginating 100 activities with identical timestamps in pages of 7 returns all 100 exactly once.
- **Testing:** Integration test.

### API-04 · Feed payload contains full polylines and N+1 style joins
- **Severity:** Medium
- **Problem:** Each feed item includes the full masked polyline (thousands of points as JSON objects). The feed query left-joins kudos *and* comments and then uses `count(distinct)`, which builds a kudos×comments cross product per activity. `hasKudos` is always `false` (SOC-03).
- **Evidence:** `mobile-backend/src/repositories/feed.repository.ts:33-50`; `src/services/feed.service.ts:66-86`.
- **Recommended solution:** Store a precomputed **simplified encoded polyline** (Douglas-Peucker to ~100–200 points, Google polyline encoding as in Strava's `map.summary_polyline`, research doc §16) in a `summary_polyline text` column at upload time. Return only that in feeds and lists. Use correlated subqueries or denormalized `kudos_count`/`comment_count` columns updated transactionally. Compute `has_kudoed` via `EXISTS`.
- **Acceptance criteria:** A feed page of 20 is under 50 KB. The query plan has no cross-product.
- **Testing:** Payload size assertion in an integration test.

### API-05 · Toggle endpoints (kudos, follow) are non-idempotent and race-prone
- **Severity:** Medium
- **Problem:** `POST /kudos` and `POST /follow` *toggle*. Two quick taps, or a retried request, flip the state twice. Combined with the client not knowing `hasKudos` (SOC-03), a "give kudos" tap can actually remove one. Kudos toggle is select-then-insert, without relying on `ON CONFLICT`.
- **Evidence:** `mobile-backend/src/repositories/activity.repository.ts` (`toggleKudos`); `src/controllers/athlete.controller.ts` (`toggleFollow`).
- **Recommended solution:** Explicit verbs. Strava kudos cannot be taken back ("No takebacks!", research doc §14), so expose **only** `PUT /activities/:id/kudos` (idempotent give, `ON CONFLICT DO NOTHING`), which also removes the toggle race entirely. Follows: `PUT/DELETE /athletes/:id/follow`.
- **Acceptance criteria:** Repeating PUT leaves exactly 1 kudos row. Repeating follow PUT leaves 1 row, and DELETE leaves 0.
- **Testing:** Integration tests.

### API-06 · No R2 / object storage despite being a confirmed technology
- **Severity:** Medium (photos are not a priority feature)
- **Problem:** No `r2_buckets` binding and no upload route. Avatars use Unsplash URLs, including the **same default stock photo for every user**.
- **Evidence:** `mobile-backend/wrangler.jsonc`; `src/services/auth.service.ts` (`avatarUrl` default).
- **Recommended solution:** Add an R2 binding when photos/avatars are scheduled (Phase 4). Use a pre-signed or Worker-proxied upload with size/type validation. Until then, use initials avatars rather than a stock photo of a stranger.
- **Acceptance criteria:** Covered in the implementation plan, Phase 4.

### API-07 · Mixed architecture: half the routes bypass the service layer
- **Severity:** Low (affects maintainability)
- **Problem:** Activities, athletes, feed and auth use controller/service/repository. Routes, segments, events, goals and messages are fat inline handlers. Notification creation is duplicated in four places.
- **Recommended solution:** Keep the layered pattern for in-scope modules. Out-of-scope modules are unmounted (ADR-15), so their inconsistency is acceptable until they return.

### API-08 · Fabricated profile data at sign-up
- **Severity:** Medium
- **Problem:** Every new user gets city "Dhaka", country "Bangladesh", 68 kg, 175 cm, max HR 188, rest HR 54 and FTP 220. These feed into calories (MET-01) and are shown on profiles as the user's real data.
- **Evidence:** `mobile-backend/src/services/auth.service.ts:36-46, 162-172`.
- **Recommended solution:** Store `null`. Onboarding asks for weight (optional, "used for calorie estimates") and city.
- **Acceptance criteria:** New user rows have null physiology fields.

---

## 9. Findings: Social features (frontend and backend)

### SOC-01 · Followers and Following screens list search results, not followers
- **Severity:** High
- **Problem:** Both screens call `api.athletes.search(query)`, which returns arbitrary users. No backend endpoint lists followers or following.
- **Evidence:** `mobile-frontend/src/app/athlete/followers.tsx:27`; `src/app/athlete/following.tsx:27`; no route in `athletes.route.ts`.
- **Recommended solution:** `GET /athletes/:id/followers` and `GET /athletes/:id/following` (paginated, `PublicAthleteDTO` + `isFollowing` relative to the viewer). Wire the screens to them.
- **Acceptance criteria:** After A follows B, B's followers list contains exactly A.
- **Testing:** Integration test, plus E2E with 2 test accounts.

### SOC-02 · Follow button on the activity detail screen is fake; follow state is never loaded
- **Severity:** High
- **Problem:** The activity detail Follow button flips local `useState` only. The feed mapper hard-codes `isFollowing: false`, so the feed's "Following" filter only shows the user's own activities (`index.tsx:32-34`). "My Clubs" filters nothing.
- **Evidence:** `mobile-frontend/src/app/activity/[id].tsx:213`; `src/context/AppContext.tsx:84`; `src/app/(tabs)/index.tsx:31-36`.
- **Recommended solution:** The home feed **is** the following feed (own plus followed athletes), fetched from the server, which is what Strava's home feed contains (research doc §12–13). For MVP use Strava's "Latest Activities" ordering. Strava orders that by **end time** (start + elapsed); we recommend the same, so a long activity uploaded late still appears near the top. Remove client-side filtering. Use one shared follow mutation that updates the server and all caches.
- **Acceptance criteria:** Following someone causes their PUBLIC/FOLLOWERS_ONLY activities to appear on the home feed after refresh. Unfollowing removes them.
- **Testing:** E2E with 2 accounts.

### SOC-03 · Kudos state unknown in feed; optimistic updates never roll back
- **Severity:** High
- **Problem:** The server always returns `hasKudos: false` in the feed. The client toggles optimistically. After a refresh, a kudoed activity shows "not kudoed", and tapping it sends a toggle that **removes** the kudos while the UI shows it being added. Failures are logged but the UI is not rolled back. On the detail screen, kudos and comments update only the *feed list* copy, not the screen's `serverActivity` state, so the detail screen doesn't visibly change.
- **Evidence:** `mobile-backend/src/services/feed.service.ts:82`; `mobile-frontend/src/context/AppContext.tsx:397-447`.
- **Recommended solution:** Return `hasKudoed` per item (`EXISTS`). Use idempotent PUT/DELETE (API-05). Use a query cache (ADR-09) with optimistic update plus rollback on error, keyed by activity id so the feed and detail views share state.
- **Acceptance criteria:** Kudos state is correct after a cold start. A failed request reverts the UI and shows a toast.
- **Testing:** Hook tests with mocked API failures.

### SOC-04 · Comments: no delete, no pagination, no length limit, no moderation basics
- **Severity:** Medium
- **Problem:** Create only. Unbounded content length. The `parentCommentId` is not validated to belong to the same activity and has no FK. All comments are returned in the detail payload.
- **Evidence:** `mobile-backend/src/repositories/activity.repository.ts` (`addComment`, `getComments`); schema `comments`.
- **Recommended solution:** Content ≤ 1,000 chars. `DELETE /comments/:id` for the author (Strava documents deleting your own comment; research doc §14). Also allowing the **activity owner** to delete comments is our recommendation for basic moderation; Strava's behavior here is unconfirmed. Drop threading for MVP (`parentCommentId` unused by the UI).
- **Acceptance criteria:** Author and activity owner can delete. Others get 404. A 1,001-char comment gets 400.
- **Testing:** Integration tests.

### SOC-05 · Notifications created even when the actor cannot see the target
- **Severity:** Low
- **Problem:** Follows from a consequence of PRIV-06. Also, a kudos toggle off and back on creates a duplicate notification each time.
- **Recommended solution:** Fixed by PRIV-06 plus idempotent kudos. Dedupe notifications on (recipient, actor, type, target).

### SOC-06 · No follower approval or private-profile model
- **Severity:** Low for MVP (documented decision)
- **Problem:** Strava lets users require approval for followers (research doc §12). Here any user can follow anyone, which immediately grants access to FOLLOWERS_ONLY activities. For MVP this is a **product decision**, not a bug, but it makes "Followers only" weaker than users expect.
- **Recommended solution:** MVP: document that follows are auto-approved. Phase 4: add `follows.status ∈ {pending, accepted}` and an athlete `requireFollowApproval` flag. Visibility checks use `status = 'accepted'`.

---

## 10. Findings: Frontend architecture, maps and Android

### FE-01 · Live map missing from the recording screen
- **Severity:** High
- **Problem:** The recording screen is explicitly "NO MAP – Pure Focused Telemetry" (commit `db6fae2` removed it). Live maps are a priority requirement, and Strava's record screen offers a map view with the route drawn live (research doc §3).
- **Evidence:** `mobile-frontend/src/app/record.tsx:177`.
- **Recommended solution:** A two-view record screen (swipe or toggle): metrics view and map view (MapLibre, user-follow camera, route line from the session's points). Throttle line updates to 1 Hz and render the line from a ref-based GeoJSON source to avoid re-rendering the whole tree.
- **Acceptance criteria:** The route line updates live during recording. No frame drops > 100 ms on a mid-range device over a 1-hour recording.
- **Testing:** Device performance test with a replayed 2-hour track.

### FE-02 · Every feed card mounts a live map instance
- **Severity:** High (performance and memory)
- **Problem:** `ActivityCard` renders `RouteMapPreview`, which is a full `StravaMapView` (MapLibre GL view, or a WebView with Leaflet in Expo Go) per card in a `FlatList`. GL contexts per list item cause memory pressure, jank and possible crashes on low-end Android. In Expo Go, each card loads Leaflet from unpkg.
- **Evidence:** `mobile-frontend/src/components/common/ActivityCard.tsx:169`; `src/components/common/RouteMapPreview.tsx`.
- **Recommended solution:** Feed cards render a **static route preview**: an SVG polyline from `summary_polyline` (`react-native-svg` is already installed) on a neutral background, or a server-generated static map image later. The full interactive map appears only on the detail screen.
- **Acceptance criteria:** Scrolling a 50-item feed holds 60 fps on a mid-range device. Memory stays flat.
- **Testing:** Perf profiling (Android Studio profiler / Flashlight).

### FE-03 · Activity detail reads response fields that don't exist, so map, kudos, comments and athlete are always empty
- **Severity:** Critical (the core "activity summary" screen is broken)
- **Problem:** The backend returns `{ activity, athlete, kudosCount, hasKudos, comments, commentsCount, isOwner }`. The client reads `res.activity.athlete`, `res.activity.kudosCount`, `res.activity.comments` and `res.activity.polyline`, none of which exist (the polyline fields are `rawPolyline`/`maskedPolyline`). Result: an empty route map, "No kudos yet", "0 comments", and an athlete named "Athlete" from "Manhattan, USA". If the fetch fails, the screen falls back to `activities[0]` and shows **a different activity**.
- **Evidence:** `mobile-frontend/src/app/activity/[id].tsx:34, 60-99`; `mobile-backend/src/services/activity.service.ts:136-148`.
- **Root cause:** Untyped (`any`) API responses; no shared contract.
- **Recommended solution:** Shared response types (ADR-11). A single `toActivityViewModel()` mapper with tests. Show a loading state, then a not-found state. Never fall back to another activity.
- **Acceptance criteria:** The detail screen shows the route, correct athlete, kudos count and comments for an activity with all of them. A nonexistent id shows "not found".
- **Testing:** Mapper unit tests with a recorded API response fixture. E2E.

### FE-04 · Profile "activities" is a filter of the first 15 global-feed items
- **Severity:** High
- **Problem:** The profile computes `userActivities = activities.filter(a => a.athlete.id === currentUser.id)` over the context's `activities`, which are the first 15 items of the **global public** feed. Users with private activities, or who are not in the latest 15 global posts, see an empty or partial history. The 12-week chart is built from that partial set. There is no pagination.
- **Evidence:** `mobile-frontend/src/app/(tabs)/profile.tsx:22`; `src/context/AppContext.tsx:149`.
- **Recommended solution:** `GET /athletes/me/activities?cursor=` (the owner sees all visibilities) feeding an infinite list. Stats come from a small `GET /athletes/:id/stats` (totals by sport for this week/year/all-time, similar to Strava's athlete stats; research doc §11). Merge in local pending-upload activities from SQLite.
- **Acceptance criteria:** A user with 40 activities (mixed visibility) sees all 40 in their history, newest first, including ones pending upload.
- **Testing:** E2E with a seeded account.

### FE-05 · Feed loads the global "all" tab and has no pagination
- **Severity:** High
- **Problem:** The app loads `getFeed('all')`, i.e. **every public activity from every user** (a discovery feed). It fetches only the first page and never calls `nextCursor`. The "Weekly Volume" card sums the distance of everyone's activities in that page and labels it as the user's.
- **Evidence:** `mobile-frontend/src/context/AppContext.tsx:149`; `src/app/(tabs)/index.tsx:84-90`.
- **Recommended solution:** Home = following feed (own plus followed, visibility-filtered), with infinite scroll via `onEndReached`. Weekly volume comes from the stats endpoint for the current user.
- **Acceptance criteria:** A new user with no follows sees only their own activities plus an empty-state CTA "Find friends". Scrolling loads further pages.

### FE-06 · API base URL hard-coded to production; no timeouts, retries or 401 handling
- **Severity:** Medium
- **Problem:** `API_BASE_URL` is a literal workers.dev URL. `EXPO_PUBLIC_API_URL` in `.env` is ignored. `fetch` has no timeout (it hangs on poor networks). An expired token (after 30 days) produces errors everywhere instead of a logout or re-auth.
- **Evidence:** `mobile-frontend/src/services/api.ts:6, 16-39`.
- **Recommended solution:** Read `process.env.EXPO_PUBLIC_API_URL`. Add an `AbortController` timeout (15 s), typed errors (`ApiError` with status), and a global 401 → logout handler. Retries only for idempotent requests.
- **Acceptance criteria:** Staging vs production is selected by env. Expired token → login screen.

### FE-07 · Settings screens are non-functional
- **Severity:** Medium
- **Problem:** GPS settings (accuracy mode, auto-pause, voice cues, cue interval) are local `useState` and are not persisted or read by the recorder. Privacy settings use a hard-coded emergency phone number `+880 1712-345678` and a beacon toggle that does nothing. There is no **default activity visibility** setting (Strava has one; research doc §15).
- **Evidence:** `mobile-frontend/src/app/settings/gps.tsx:9-12`; `src/app/settings/privacy.tsx:22-23`.
- **Recommended solution:** A `user_settings` row server-side (default visibility, units, hide start/end distance, auto-pause) plus a local mirror in SQLite for offline use. Remove the beacon and voice cue UIs until implemented.
- **Acceptance criteria:** Changing default visibility to Followers pre-selects Followers on the next save screen. Auto-pause off changes recorder behavior.

### FE-08 · Beacon toggle on the record screen never starts a session
- **Severity:** Low (feature out of scope)
- **Problem:** `onToggleBeacon={setIsBeaconActive}` only sets a boolean. `beaconToken` is never assigned, so the ping effect never fires.
- **Evidence:** `mobile-frontend/src/app/record.tsx:27-28, 345`.
- **Recommended solution:** Remove from the MVP UI (ADR-15).

### FE-09 · Map provider: Leaflet WebView fallback uses tile servers in a way their policies don't permit for apps
- **Severity:** Medium (legal/operational risk)
- **Problem:** In Expo Go, the fallback loads `tile.openstreetmap.org` directly. The OSM Tile Usage Policy discourages heavy or app use and requires a valid identifying User-Agent and attribution. ArcGIS World Imagery tiles have their own terms. CARTO basemaps (used by MapLibre) are free only within limited, attribution-required terms. *Exact current terms for CARTO and ArcGIS were not verified in this audit (UNVERIFIED); review them before release.* Background location already requires a development build, so the Expo Go fallback has no remaining purpose for the recording use case.
- **Evidence:** `mobile-frontend/src/components/map/LeafletMapView.tsx:51-63`; `src/components/map/mapTypes.ts` (`MAP_STYLES`).
- **Recommended solution:** Keep **MapLibre** (correct choice: open-source, native, no per-load fees). Delete the Leaflet/WebView fallback and `MapFallbackView`. Use a tile provider with explicit app terms and an API key (MapTiler, Stadia Maps or Protomaps PMTiles on R2), and make the style URL configurable via env. Show attribution.
- **Acceptance criteria:** One map implementation. Attribution visible. Tile provider terms documented in `docs/`.

### FE-10 · Android app identity, Gradle props and edge cases
- **Severity:** Medium
- **Problem:** The package is `com.anonymous.mobilefrontend` and the name is `mobile-frontend`. `android.gradleProperties` is an invalid key (expo-doctor). No `expo-build-properties` is used. No battery-optimization guidance exists for OEMs (Strava publishes device-specific guidance; research doc §2).
- **Recommended solution:** Set a real `android.package` (it is permanent once on the Play Store) and app name. Move Gradle props to `expo-build-properties` or remove them. Add an in-app "Recording reliability" helper that detects battery optimization (opening system settings via `expo-intent-launcher`, a small justified dependency, or `Linking.sendIntent`).
- **Acceptance criteria:** expo-doctor 20/20. The package id is decided and documented.

### FE-11 · Two parallel Google Sign-In implementations
- **Severity:** Low
- **Problem:** The login screen probes for the native `@react-native-google-signin` module and falls back to `expo-auth-session` for Expo Go. The app needs a dev build anyway (GPS-01), so the fallback is now dead weight and a second OAuth configuration to maintain.
- **Evidence:** `mobile-frontend/src/app/auth/login.tsx:2-3, 25-75`.
- **Recommended solution:** Keep the native module only. Remove `expo-auth-session`/`expo-crypto` if they become unused.

### FE-12 · NativeWind v5 *release candidate* and pre-release-adjacent dependency set
- **Severity:** Medium (UNVERIFIED stability)
- **Problem:** `nativewind@^5.0.0-rc.1` and `react-native-css@^3.1.0-rc.1` are release candidates. Recent commits ("replace nativewind classes with inline styles", "enforce explicit flex styles and remove timing animation crash") suggest styling instability was already encountered. Screens now mix `className` and inline styles.
- **Evidence:** `mobile-frontend/package.json`; commits `1b3283e`, `fc1f7fc`, `3c90b8e`.
- **Recommended solution:** Do not switch libraries mid-rebuild. **Pin exact versions** (no caret on RCs). During the UI phase, decide between NativeWind stable (if released by then) and `StyleSheet` with a design-token module. Do not mix both in new code.
- **Acceptance criteria:** Exact pins. One styling approach documented for new screens.

### FE-13 · Out-of-scope surface area is large and partly fake
- **Severity:** Medium (dilutes effort, misleads testers)
- **Problem:** Analytics (fitness/freshness, race predictions, training plans, heatmap, relative effort), clubs, challenges, events, segments, routes/route builder/navigation, messages and beacon make up ~4,000 LOC of screens. Several show computed-from-nothing or hard-coded content (e.g. `MatchedSegmentsSection` on every activity, segment KOM "Community Leader 3:20" in `AppContext.tsx:209-212`).
- **Recommended solution:** Hide them behind `EXPO_PUBLIC_FEATURE_*` flags (tabs and entry points removed) for the MVP. Do not delete them yet: they may be revived later and their files cost nothing when unrouted. Unmount the corresponding backend routers in production.
- **Acceptance criteria:** MVP navigation exposes only Home (feed), Record, Profile (history, stats, followers), Search, Notifications and Settings.

---

## 11. Findings: Quality engineering

### QA-01 · No automated tests at all
- **Severity:** High
- **Problem:** No test runner or tests in either package. The highest-risk logic (distance, moving time, elevation, splits, calories, privacy policy, feed visibility) is pure and easily testable, yet untested.
- **Recommended solution:** Backend: **Vitest** with `@cloudflare/vitest-pool-workers` (or plain Vitest against the Hono app via `app.request()` with a test Postgres). Frontend: **Jest via `jest-expo`** (Expo's supported preset) for pure modules and hooks. Put metric code in pure TS modules with **fixture tracks** recorded on real devices.
- **Acceptance criteria:** CI runs typecheck, lint and tests on every PR. Coverage ≥ 90% for `metrics/` and `policy` modules.

### QA-02 · No lint configuration; no CI
- **Severity:** Medium
- **Problem:** `expo lint` has no config. No GitHub Actions or other CI.
- **Recommended solution:** Commit `eslint-config-expo` (flat config) in the frontend, `typescript-eslint` in the backend, and a CI workflow (typecheck + lint + tests + secret scan).

### QA-03 · `any` at every boundary
- **Severity:** Medium
- **Problem:** 137 `any`/`as any` occurrences. All API responses are `any`, which hid FE-03, SEC-07 and SYNC-01.
- **Recommended solution:** Shared contract types (ADR-11). Lint rule `@typescript-eslint/no-explicit-any: warn`, raised to `error` in `services/`, `metrics/` and `policy/`.

### QA-04 · Stale build artifacts and unused mock data in the tree
- **Severity:** Low
- **Problem:** `mobile-frontend/dist/` (ignored, but present locally; a 74k-line Hermes bundle), `src/mock/data.ts` (676 lines, unused), and `scripts/reset-project.js` (Expo template leftover).
- **Recommended solution:** Delete `src/mock/data.ts` once fixtures replace it. Remove the template script.

---

## 12. Finding index

| ID | Severity | Area | Title |
|---|---|---|---|
| SEC-01 | Critical | Security | DB credentials committed |
| SEC-02 | Critical | Security | Demo/mock token backdoor in prod |
| SEC-03 | Critical | Security | SHA-256 static-salt password hashing |
| SEC-04 | Critical* | Security | JWT secret fallback / committed secret |
| PRIV-01 | Critical | Privacy | Detail ignores visibility |
| PRIV-02 | Critical | Privacy | Following/clubs feed leak private activities |
| PRIV-03 | Critical | Privacy | Profile leaks raw GPS, private activities, email |
| PRIV-04 | Critical | Privacy | Unauthenticated raw GPX export |
| GPS-01 | Critical | Recording | No background location |
| GPS-02 | Critical | Recording | Time from tick counters |
| GPS-03 | Critical | Recording | Resume teleport distance |
| GPS-07 | Critical | Recording | No persistence/recovery |
| SYNC-01 | Critical | Sync | Visibility/startTime not sent (all PUBLIC) |
| SYNC-02 | Critical | Sync | Upload failure discards activity |
| FE-03 | Critical | Frontend | Detail screen reads wrong fields |
| SEC-05 | High | Security | Email-based account linking |
| SEC-07 | High | Security | Goals route writes to wrong user / unauth delete |
| PRIV-05 | High | Privacy | Search exposes PII |
| PRIV-06 | High | Privacy | Kudos/comments on invisible activities; self-kudos |
| GPS-04 | High | Recording | Drift inflates distance |
| GPS-05 | High | Recording | Auto-pause hard-coded, no hysteresis |
| GPS-06 | High | Recording | Elevation from raw noise |
| GPS-08 | High | Recording | Splits inaccurate, fake HR |
| GPS-10 | High | Recording | Start before fix / after denial |
| MET-01 | High | Metrics | Three invented calorie formulas |
| MET-03 | High | Metrics | Fabricated defaults displayed |
| SYNC-03 | High | Sync | No idempotency |
| SYNC-04 | High | Sync | No payload validation |
| SYNC-05 | High | Sync | No edit/delete |
| SYNC-06 | High | Sync | Save screen drops fields |
| SYNC-07 | High | Sync | Finished activity can be wiped |
| API-01 | High | Backend | Pool per handler |
| API-02 | High | Backend | Missing indexes |
| SOC-01 | High | Social | Followers lists are search results |
| SOC-02 | High | Social | Fake follow button; Following filter broken |
| SOC-03 | High | Social | Kudos state wrong; no rollback |
| FE-01 | High | Frontend | No live map while recording |
| FE-02 | High | Frontend | Live map per feed card |
| FE-04 | High | Frontend | Profile history from global feed page |
| FE-05 | High | Frontend | Global feed, no pagination |
| QA-01 | High | Quality | No tests |
| SEC-06 | Medium | Security | Optional Google audience |
| SEC-08 | Medium | Security | Token in AsyncStorage |
| PRIV-07 | Medium | Privacy | Masking only at upload, no hide start/end |
| GPS-09 | Medium | Recording | Simulation in prod |
| GPS-11 | Medium | Recording | Speed fallback / max speed spikes |
| MET-02 | Medium | Metrics | Mislabelled timer/pace |
| MET-04 | Medium | Metrics | Duplicated formatting |
| SYNC-08 | Medium | Frontend | Whole-app re-render per tick |
| API-03 | Medium | Backend | Cursor skips ties |
| API-04 | Medium | Backend | Heavy feed payload |
| API-05 | Medium | Backend | Toggle endpoints non-idempotent |
| API-06 | Medium | Backend | No R2 |
| API-08 | Medium | Backend | Fabricated profile at sign-up |
| SOC-04 | Medium | Social | Comments: no delete/limits |
| FE-06 | Medium | Frontend | Hard-coded URL, no timeouts/401 |
| FE-07 | Medium | Frontend | Settings non-functional |
| FE-09 | Medium | Frontend | Tile usage policy risk / dual map impl |
| FE-10 | Medium | Android | Package id, invalid config |
| FE-12 | Medium | Frontend | RC styling deps |
| FE-13 | Medium | Frontend | Large fake out-of-scope surface |
| QA-02 | Medium | Quality | No lint/CI |
| QA-03 | Medium | Quality | `any` at boundaries |
| SEC-09 | Low | Security | CORS *, raw error messages |
| API-07 | Low | Backend | Mixed layering |
| SOC-05 | Low | Social | Notification dupes |
| SOC-06 | Low | Social | No follow approval (product decision) |
| FE-08 | Low | Frontend | Beacon toggle dead |
| FE-11 | Low | Frontend | Dual Google sign-in |
| QA-04 | Low | Quality | Dead files |

\*SEC-04 is Critical if production lacks `JWT_SECRET` or reuses the committed value. Verify in the Cloudflare dashboard.

---

## 13. Status updates

### 2026-11-19 — UI/UX redesign (frontend only; see STRAVA_SCREEN_DESIGN_PLAN.md §8)
| Finding | Status after this change |
|---|---|
| SYNC-01 | **Fixed on the client.** Visibility, start time, sport, max speed and calories are sent. Server-side validation (SYNC-04) is still missing. |
| SYNC-02 | **Mitigated.** A failed upload keeps the in-memory recording and offers a retry. The recording is still lost if the app is killed (needs the SQLite outbox, ADR-05/06). |
| SYNC-06 | **Fixed.** The sport chosen on Save is used. Non-persisted fields were removed from the UI. |
| SYNC-07 | **Mitigated.** Finish no longer tears down the recording, so the Save screen can Resume. Discard requires confirmation. A new session can't start while one is unfinished, because the recorder UI shows Resume/Finish. |
| FE-01 | **Fixed** (live map on the recorder). |
| FE-02 | **Fixed** (static SVG route previews in lists). |
| FE-03 | **Fixed** (correct detail mapping; never shows another activity). |
| FE-04 / FE-05 | **Partially fixed.** Home uses the following feed with pagination. The profile uses the profile endpoint (10 most recent) with incompleteness flagged. A full history endpoint is still needed. |
| FE-07 | **Partially fixed.** Fake settings removed. Privacy zones now use the real location (**new finding:** zones were previously saved at hard-coded Dhaka coordinates). Default visibility/units/auto-pause settings are still missing. |
| FE-09 | **Partially fixed.** **New finding:** MapLibre was never rendering (v10 API against the v11 package). The new `MapView` uses v11. Leaflet is kept only for Expo Go. The tile provider decision is still open. |
| GPS-09 | **Mitigated** (simulation not reachable from the redesigned recorder; code still exists in the hook). |
| MET-01 | **Fixed on the client** (one MET-based estimate used live, on save and in display). The server still has its own fallback formula. |
| MET-02 / MET-03 / MET-04 | **Fixed** for MVP screens. |
| SOC-01 | **Mitigated.** Fake follower/following lists are unreachable. Counts are not tappable until endpoints exist. |
| SOC-02 | **Fixed** (fake follow removed; Home is the following feed). |
| SOC-03 | **Fixed on the client** (give-only kudos with a state check, rollback on error). The server should still return `has_kudoed` and offer idempotent PUT. |
| PRIV-01…06, SEC-01…07 | **Unchanged — still open.** Because the client now sends "Only you" correctly, the server leaks in PRIV-02/03 now affect deliberately private activities. **Phase 0 is urgent.** |
| QA-01 / QA-02 | **Started.** ESLint (`eslint-config-expo`) and Jest (`jest-expo`) configured in the frontend, with 30 unit tests. No CI yet. |

### 2026-11-20 — Phase 3: core tracking, persistence, sync and backend hardening
Verification legend: **T** = covered by automated tests (`shared` + backend: Vitest, 52 tests; app: Jest, 37 tests) · **D** = verified on the Pixel 7a (Android 17) · **—** = not verified yet.

| Finding | Status | Verified |
|---|---|---|
| GPS-01 | **Fixed in code.** Foreground-service location task (expo-task-manager); no background-location permission needed. See [STRAVA_BACKGROUND_TRACKING.md](STRAVA_BACKGROUND_TRACKING.md). | see device log |
| GPS-02 | **Fixed.** Timer = wall clock − pauses (`activeMs`); moving time from fix timestamps. No tick counting. | T |
| GPS-03 | **Fixed.** Each resume starts a new segment; distance never bridges a pause. | T |
| GPS-04 / GPS-11 | **Fixed.** Shared `PointFilter`: accuracy, stale/duplicate, invalid, impossible-speed (with a re-anchor after 10 s); Doppler-based stationary gate; max speed from a 10 s window. Stationary 5 min → ≤ 20 m and ≤ 10 s (plan T-2), synthetic. | T (synthetic tracks; real-world tuning still needed) |
| GPS-05 | **Changed.** Auto-pause removed (it stopped time but not distance). Moving time uses a per-sport speed threshold. A real auto-pause setting is still open. | T |
| GPS-06 | **Fixed.** Altitude accuracy ≤ 10 m, 5-point smoothing, 10 m hysteresis. Reported as "–" when coverage is insufficient. | T |
| GPS-07 | **Fixed in code.** Session, lifecycle, pauses, events and every fix persisted in SQLite. Interruption → PAUSED(`interrupted`) with Resume/Finish. | see device log |
| GPS-08 | **Fixed.** Interpolated 1 km splits plus a final partial split; no heart rate. | T |
| GPS-09 | **Fixed.** Simulator removed with `use-gps-recorder.ts`. | — |
| GPS-10 | **Fixed.** PREPARING state with GPS status; Start is disabled when permission is denied or location is off. | — |
| SYNC-02 | **Fixed.** Local-first: Save commits to SQLite, then uploads. Nothing local is deleted before the server confirms; 7-day retention after that. | T (client worker) |
| SYNC-03 | **Fixed.** Client UUID per recording; `UNIQUE(athlete_id, client_activity_id)`; transaction with a row lock on `/complete`; idempotent start/batch/complete; legacy `POST /activities` idempotent when given the id. 5 concurrent completes → 1 activity. | T |
| SYNC-04 | **Fixed.** zod validation on all activity writes; server recomputes metrics from the raw points with the shared module (client numbers are not trusted). | T |
| SYNC-05 | **Fixed.** `PATCH`/`DELETE /activities/:id` (owner only, others get 404); app edit screen + owner menu. A deleted activity is not resurrected by a late upload retry. | T (API) |
| SYNC-07 | **Fixed.** A new recording can't start while one is active (engine guard). | — |
| SYNC-08 | **Fixed.** Recording state moved out of AppContext into a `useSyncExternalStore` store. | — |
| API-01 | **Fixed.** One `pg.Client` per request, closed via `waitUntil`. | bundle builds (`wrangler deploy --dry-run`); not deployed |
| API-03 | **Fixed** for feed and history (row-value cursor). | T |
| API-05 | **Partially fixed.** Kudos are give-only and idempotent (`ON CONFLICT DO NOTHING`), no self-kudos. Follow is still a toggle. | T |
| API-08 | **Fixed for new accounts** (no invented city/weight/HR). Existing rows unchanged. | — |
| SEC-01 | **Mitigated in the repo.** `drizzle.config.ts` and `scripts/*` read `DATABASE_URL`; `.dev.vars` untracked; `.dev.vars.example` added. **The password is still in git history: rotate it.** | — |
| SEC-02 | **Fixed.** `demo-google-token` / `mock:` bypass removed; `/auth/demo-login` returns 404 in production. | T |
| SEC-04 | **Fixed.** No JWT fallback secret: fails closed (500) if `JWT_SECRET` is missing or shorter than 32 characters. | T |
| SEC-05 / SEC-06 | **Fixed.** Account linking only with `email_verified`; Google audience mandatory. | T (mock tokens rejected) |
| SEC-07 | **Unchanged by request.** The product owner asked that no existing module be removed, so clubs, challenges, segments, routes, events, goals, messages and beacon stay mounted. Their own authorization issues remain open. | — |
| PRIV-01/02/03/06 | **Fixed.** Single policy (`lib/policy.ts`) applied to detail, following feed, clubs feed, profile list, history, kudos and comments; invisible = 404. Public DTOs whitelist fields (no email or physiology for others). Raw track only for the owner. | T (visibility matrix: 4 viewers × 3 visibilities × detail/history/profile/feed/kudos/comments/export) |
| PRIV-04 | **Fixed.** GPX export requires auth, owner only, XML-escaped. | T |
| PRIV-05 | **Partially fixed.** Search returns the public DTO; it still lists all users when the query is empty. | — |
| SEC-03 | **Open.** Password hashing is still SHA-256 with a static salt. Moving to PBKDF2 needs a CPU-budget check on the Workers plan. | — |

**Deployment status:** none of the backend changes are deployed. Migration `drizzle/0002_batch_uploads.sql` is additive (2 new tables, 1 nullable column, 2 indexes) and has not been run against Neon. Until it is deployed, the app falls back to the legacy single-request upload; it still uploads, but without the batch protocol.

**Database decision:** the Phase 3 brief names Cloudflare D1, but the confirmed stack (Phase 1, ADR-16) and the deployed backend use Neon Postgres via Hyperdrive. This phase kept Neon; all new code goes through Drizzle repositories. Moving to D1 is a separate migration that needs a product decision (see the implementation plan).
