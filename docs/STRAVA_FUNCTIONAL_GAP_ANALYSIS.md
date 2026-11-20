# Functional Gap Analysis: Priority Features

**Date:** 2026-11-19 · **Commit:** `1f954d8`

This document compares each **priority feature** in the team leader's scope with (a) what Strava does ([research](STRAVA_PRODUCT_RESEARCH.md)) and (b) what the code **actually does** ([audit](STRAVA_TECHNICAL_AUDIT.md)). Each verdict is about *function*, not whether a screen exists.

**Status legend**

| Status | Meaning |
|---|---|
| ✅ Working | Works correctly for the MVP |
| 🟡 Partial | Works in the happy path; incorrect in common cases |
| 🔴 Broken | The UI exists but produces wrong results or loses data |
| 🎭 Façade | The UI exists, but nothing (or fake data) behind it |
| ⬜ Missing | Not implemented |

**Verification basis:** code reading plus automated checks (typecheck passes; no tests exist). No physical-device GPS test was possible in this audit environment. Device-dependent statements are derived from code and the Expo SDK 58 documentation and are marked *(code+docs)*.

---

## 1. Scorecard

| # | Priority feature | Status | Severity of gap | Key findings |
|---|---|---|---|---|
| F1 | Running tracking | 🔴 Broken | Critical | GPS-01…08 |
| F2 | Walking tracking | 🔴 Broken | Critical | as F1, plus GPS-05 (slow speeds) |
| F3 | Hiking tracking | 🔴 Broken | Critical | as F1, plus GPS-06 (elevation), SYNC-02 (offline) |
| F4 | Cycling tracking | 🔴 Broken | Critical | as F1, plus MET-01 (calories), GPS-11 |
| F5 | GPS tracking (accuracy, filtering) | 🔴 Broken | High | GPS-04, GPS-10, GPS-11 |
| F6 | Background tracking / screen lock | ⬜ Missing | Critical | GPS-01, GPS-02 |
| F7 | Live maps (while recording) | ⬜ Missing | High | FE-01 |
| F8 | Activity recording lifecycle (start/pause/resume/finish/discard) | 🔴 Broken | Critical | GPS-03, GPS-10, SYNC-07 |
| F9 | Recovery after interruption | ⬜ Missing | Critical | GPS-07 |
| F10 | Offline recording and sync | 🔴 Broken (data loss) | Critical | SYNC-02, SYNC-03 |
| F11 | Distance | 🔴 Broken | Critical | GPS-03, GPS-04 |
| F12 | Duration (elapsed / moving) | 🔴 Broken | Critical | GPS-02 |
| F13 | Speed and pace | 🟡 Partial | Medium | GPS-11, MET-02, MET-04 |
| F14 | Elevation gain | 🔴 Broken | High | GPS-06 |
| F15 | Calories estimation | 🔴 Broken | High | MET-01, API-08 |
| F16 | Activity summary (save screen) | 🔴 Broken | Critical | SYNC-01, SYNC-06 |
| F17 | Activity details screen | 🔴 Broken | Critical | FE-03, MET-03 |
| F18 | Activity history (profile) | 🔴 Broken | High | FE-04 |
| F19 | Activity feed | 🔴 Broken | High | FE-05, SOC-02, PRIV-02, API-03 |
| F20 | Visibility: Everyone / Followers / Only You | 🔴 Broken (privacy breach) | Critical | SYNC-01, PRIV-01…06 |
| F21 | Follow / unfollow | 🟡 Partial | High | SOC-01, SOC-02, API-05 |
| F22 | Kudos | 🟡 Partial | High | SOC-03, PRIV-06, API-05 |
| F23 | Comments | 🟡 Partial | Medium | SOC-03, SOC-04, PRIV-06 |
| F24 | Edit / delete activity | ⬜ Missing | High | SYNC-05 |
| F25 | User profile | 🟡 Partial | High | PRIV-03, API-08, MET-03 |
| F26 | Authentication | 🔴 Broken (security) | Critical | SEC-01…06 |
| F27 | Settings relevant to scope (units, default visibility, auto-pause) | 🎭 Façade | Medium | FE-07 |

**Bottom line:** none of the 27 priority capabilities is fully working. 4 are partially working (follow, kudos, comments, profile). The rest are broken, missing or façades. The most valuable salvageable assets are the **navigation shell, visual components, the backend layering, the schema foundation, and the MapLibre integration**.

---

## 2. Gap details

Each entry: **Strava behavior → Current behavior → Gap → Severity · Evidence · Root cause · Fix · Acceptance · Testing**. Long explanations are in the audit under the referenced IDs.

### F1–F4 · Sport tracking (Run, Walk, Hike, Ride)
- **Strava:** sport preselected from last use. Pace for foot sports, speed for rides. Live elevation for Hike/Ride. Auto-pause defaults differ (rides on). Calories per sport (research §1, §5, §7, §8).
- **Current:** The sport only changes the pace vs speed label and the simulator's base speed. Auto-pause is identical for all sports (`speed < 0.8`). Calories ignore sport. The sport change on the save screen is dropped. Swim/Surf map to `Workout`.
- **Gap:** No sport configuration. Wrong defaults for slow sports. The sport selected on save is ignored.
- **Severity:** Critical (because the underlying recorder is broken; see F5–F12).
- **Evidence:** `use-gps-recorder.ts:278`; `record.tsx:107`; `save-activity.tsx:36`; `SportPickerModal.tsx:21-22`.
- **Root cause:** No sport config table; sport is passed as a label only.
- **Fix:** `sportConfig` in `shared/metrics` (ADR-04). MVP sports = Run, Walk, Hike, Ride. Remember the last sport.
- **Acceptance:** For each sport, the live screen shows the correct primary metric, auto-pause follows the per-sport default, and the saved activity carries the sport selected on the save screen.
- **Testing:** Unit tests for the config lookups. A device walk + ride test for each sport (protocol T-1 in the plan).

### F5 · GPS accuracy and filtering
- **Strava:** "GPS Signal Acquired" / GPS halo before and during recording. Advice to wait for a good fix. Distance is 2D. Outliers are removed by "Correct Distance" (research §2, §4).
- **Current:** Start immediately with no fix. Accuracy cutoff 30 m. Jitter ≥ 0.8 m is accepted. No implied-speed or timestamp checks. A cached first fix becomes the start point.
- **Gap:** Stationary drift inflates distance. Teleport spikes are accepted.
- **Severity:** High · **Evidence:** `use-gps-recorder.ts:194-221, 241-259` · **Root cause:** Minimal heuristics in the UI layer.
- **Fix:** `filterTrack()` (ADR-04). Pre-start GPS acquisition state with an accuracy indicator (GPS-10).
- **Acceptance:** 5 min stationary ≤ 20 m. Measured 1 km route within 3%. Start disabled until accuracy ≤ 20 m (with a "start anyway" option).
- **Testing:** Fixture-based unit tests. Device protocol T-1/T-2.

### F6 · Background tracking and screen lock
- **Strava:** Records with the screen off. Android users are told to allow background GPS and disable battery optimization (research §2).
- **Current:** Foreground-only `watchPositionAsync`. No background permission, no foreground service, no task. The timer freezes when JS is suspended *(code+docs)*.
- **Gap:** Recording effectively stops with the screen off.
- **Severity:** Critical · **Evidence:** `use-gps-recorder.ts:224`; `app.json` plugins and permissions · **Root cause:** Built and tested in an emulator / Expo Go.
- **Fix:** ADR-03 (TaskManager + `startLocationUpdatesAsync` + foreground service, dev build).
- **Acceptance:** A 20 min walk with the screen locked from minute 1 yields a continuous track (no gap > 10 s), and time and distance are within 3% of the reference. The notification is visible throughout.
- **Testing:** Device protocol T-3 on ≥ 2 OEMs (Pixel + Samsung or Xiaomi).

### F7 · Live map while recording
- **Strava:** Map and stats views are switchable during recording. The route is drawn live with a GPS halo (research §3).
- **Current:** The record screen deliberately has no map (`record.tsx:177`). The map components exist elsewhere.
- **Gap:** Missing.
- **Severity:** High · **Root cause:** Removed in commit `db6fae2` (likely due to performance or crash issues with per-update re-renders).
- **Fix:** ADR-14. A map view on the record screen fed from the recording store at ≤ 1 Hz, using a `ShapeSource` update rather than a full re-render.
- **Acceptance:** The route line updates live. Camera follow toggles. No frame drops > 100 ms over a 1 h replay on a mid-range device.
- **Testing:** Replay a 2 h fixture via the dev replay tool and profile.

### F8 · Recording lifecycle
- **Strava:** Start → Pause/Resume (manual pause needs manual resume) → Finish → Save screen. Discard is confirmed and irreversible (research §3, §8).
- **Current:** Start runs before the GPS check. Pause doesn't break segments (teleport on resume). After Finish, Back + Start wipes the unsaved activity. Android hardware back isn't guarded.
- **Gap:** Data corruption and loss on ordinary navigation.
- **Severity:** Critical · **Evidence:** GPS-03, GPS-10, SYNC-07.
- **Fix:** A persisted state machine (`acquiring → recording ⇄ paused → finished → saved → uploaded | discarded`) with segments.
- **Acceptance:** Every transition is unit-tested, invalid transitions throw, and no navigation path discards data without a confirmation.
- **Testing:** State-machine unit tests. Manual navigation script (plan T-4).

### F9 · Recovery after interruption
- **Strava:** Not documented (research §9, unconfirmed). **Our requirement:** do not lose recorded data.
- **Current:** All state is in React memory, so a crash or OS kill loses the activity.
- **Severity:** Critical · **Fix:** ADR-05 (SQLite journal) plus a recovery prompt at launch.
- **Acceptance:** After `adb shell am force-stop` mid-recording and relaunch: the recovery prompt appears with all points up to ≤ 5 s before the kill, and Resume continues as a new segment.
- **Testing:** Device protocol T-5.

### F10 · Offline recording and sync
- **Strava:** Records offline. Uploads automatically when connected. Pending/Unsync'd list with Retry (research §9).
- **Current:** Upload is attempted once. On failure the log says "saved locally" but nothing is saved, and the recording is discarded.
- **Severity:** Critical · **Evidence:** `AppContext.tsx:605-609` · **Fix:** ADR-06 (outbox + idempotency).
- **Acceptance:** Airplane-mode recording → save → it appears as "Pending upload" → reconnect → uploaded exactly once within 30 s of the app being foregrounded.
- **Testing:** Outbox unit tests (network fail, timeout, 5xx, 4xx). Server idempotency integration test. Device protocol T-6.

### F11 · Distance
- **Strava:** 2D sum over GPS points, with outlier removal (research §4).
- **Current:** Haversine (correct formula) but: resume teleport (GPS-03), drift creep (GPS-04), no server recompute.
- **Severity:** Critical · **Fix:** Segment-aware distance in `computeSummary`; server recompute.
- **Acceptance:** ±3% on a measured route. A pause with movement adds 0. Stationary ≤ 20 m per 5 min.
- **Testing:** Unit tests (synthetic + fixtures). Device protocols T-1, T-2.

### F12 · Duration: elapsed and moving time
- **Strava:** Elapsed = start to finish wall time. Moving = time above an (unpublished) speed threshold. Averages use moving time (research §4).
- **Current:** Both are `setInterval` counters. Moving time keeps counting when stationary because no new fix arrives. The big timer shows moving time.
- **Severity:** Critical · **Fix:** Timestamp-based elapsed; moving time from point pairs (ADR-04).
- **Acceptance:** Elapsed equals the wall clock ±1 s after 5 min in the background. A 60 s stand-still adds ≤ 2 s of moving time.
- **Testing:** Unit tests on synthetic tracks. Device protocol T-3.

### F13 · Speed and pace
- **Strava:** Runs show split average pace live. Rides show current speed while moving and average speed while paused. Averages over moving time (research §5).
- **Current:** Average pace labelled as current. Ride shows instantaneous Doppler speed. Formatting is duplicated with errors (> 1 h shown as "65:00").
- **Severity:** Medium · **Fix:** Smoothed current pace/speed; per-sport display rules; a single `format.ts`.
- **Acceptance:** The labels match the computations. The formatting helpers pass edge-case tests.
- **Testing:** Unit tests.

### F14 · Elevation gain
- **Strava:** Corrected elevation from a basemap for phone recordings. Gain counts only consistent climbs > 10 m for non-barometric data (research §6).
- **Current:** Sums every raw GPS altitude increase > 0.6 m, so it vastly over-counts on flat ground.
- **Severity:** High · **Fix:** Smoothing + 10 m hysteresis now; DEM correction post-MVP.
- **Acceptance:** A flat 30 min route reports ≤ 15 m. A known hill is within ±25% of the DEM profile.
- **Testing:** Unit tests with a noisy synthetic profile. Device protocol T-2.

### F15 · Calories
- **Strava:** Estimated for run/ride/walk/hike. Uses weight (runs) or power and weight (rides). Changes when weight changes (research §7).
- **Current:** Three different formulas (live, server, detail). None use weight or sport. Every user is assigned a fabricated 68 kg.
- **Severity:** High · **Fix:** One MET-based function (sport, speed, weight, moving time), labelled "Estimated". Prompt for weight.
- **Acceptance:** The same number appears on all screens. Ride kcal/km < Run kcal/km. Calories scale with weight.
- **Testing:** Unit tests against Compendium-derived reference values.

### F16 · Activity summary / save screen
- **Strava:** Title (defaults to time-of-day + sport, unconfirmed), description, sport, visibility, perceived exertion, hide details, photos (research §3).
- **Current:** Visibility and start time are not sent, so the activity is **public with the wrong date**. Sport, tag, exertion and private notes are dropped. The photo button is fake.
- **Severity:** Critical · **Evidence:** `AppContext.tsx:584-595`; `save-activity.tsx:36`.
- **Fix:** A full typed `SaveActivityInput` persisted locally then uploaded. Remove unsupported controls (photos, tags) until implemented.
- **Acceptance:** Every visible control affects the stored activity. An ONLY_ME save is stored as ONLY_ME. `start_time` equals the session start.
- **Testing:** E2E per visibility value. A contract test on the request schema.

### F17 · Activity details
- **Strava:** Map (full-screen on tap), stats incl. moving and elapsed time, splits, elevation chart, kudos list, comments (research §10).
- **Current:** Reads non-existent response fields, so there is **no map, 0 kudos, 0 comments, and a wrong athlete**. Falls back to another activity on error. Fabricated HR, max speed and relative effort. The Follow button is fake.
- **Severity:** Critical · **Evidence:** `activity/[id].tsx:34, 60-99, 213` · **Root cause:** `any`-typed API.
- **Fix:** Shared response types, a single mapper, an honest empty/hidden state for missing data, real follow mutation, owner edit/delete menu.
- **Acceptance:** For a seeded activity with route, kudos and comments, all of them render. A nonexistent or private id shows "not available".
- **Testing:** Mapper unit test with a recorded fixture. E2E.

### F18 · Activity history
- **Strava:** You → Activities (searchable list); Progress (weekly/monthly bars) (research §11).
- **Current:** A client filter over the first 15 global public feed items. Private activities never appear.
- **Severity:** High · **Fix:** `GET /athletes/me/activities` (cursor), `GET /athletes/:id/activities` (policy-filtered), `GET /athletes/:id/stats`. Merge local pending activities.
- **Acceptance:** A user with 40 mixed-visibility activities sees all 40 on their own profile. Another user sees only the permitted ones.
- **Testing:** Integration tests (visibility matrix). E2E.

### F19 · Activity feed
- **Strava:** Home = followed athletes + yourself; "Latest" is ordered by end time; Only You is never shown; muted activities are hidden from others (research §13).
- **Current:** A global public feed; a "Following" filter that only shows yourself (isFollowing is always false); a no-op "Clubs" filter; first page only; a cursor that skips ties; the backend following/clubs tabs leak private activities; a full live map per card.
- **Severity:** High (UX) / Critical (privacy part covered in F20).
- **Fix:** Server following feed with the policy predicate, infinite scroll, a static route preview, the clubs tab removed.
- **Acceptance:** After following B, B's permitted activities appear. ONLY_ME never appears for others. Infinite scroll returns every item exactly once. 60 fps scroll on a mid-range device.
- **Testing:** Feed integration tests; pagination test with tied timestamps; perf profiling.

### F20 · Visibility: Everyone / Followers / Only You
- **Strava:** Enforced everywhere. Non-followers don't see the start time. New accounts hide the first and last 200 m of the map (research §15).
- **Current:** **Every activity is stored PUBLIC** (SYNC-01). Even if stored correctly, ONLY_ME leaks through following/clubs feeds (PRIV-02), the profile endpoint (PRIV-03, including the **raw track** to anonymous users), detail (PRIV-01), the unauthenticated GPX export (PRIV-04), and kudos/comments (PRIV-06).
- **Severity:** Critical.
- **Fix:** ADR-12 policy module, DTO whitelists, a default hide start/end of 200 m, a default-visibility user setting, UUID ids.
- **Acceptance:** A 3 viewers × 3 visibilities × follow-relation matrix passes on detail, feed, profile list, stats, kudos, comments and export. No response ever contains another user's raw track or email.
- **Testing:** Automated matrix (mandatory before any user test). A contract test on response keys.

### F21 · Follow / unfollow
- **Strava:** Follow; optional approval for private profiles; follower/following lists; remove follower; block (research §12).
- **Current:** The backend toggle works but is non-idempotent. The followers/following screens show search results. The detail-screen follow is fake. Follow state isn't loaded in the feed.
- **Severity:** High · **Fix:** `PUT/DELETE /athletes/:id/follow`, list endpoints, shared follow mutation. Approval post-MVP.
- **Acceptance:** Follow lists are accurate; repeated PUT is idempotent; follow state is consistent across screens.
- **Testing:** Integration + E2E with two accounts.

### F22 · Kudos
- **Strava:** Give-only ("No takebacks!"); list of givers; orange icon when given (research §14).
- **Current:** A toggle (can be undone). `hasKudos` is always false in the feed, so a second tap removes the kudos while the UI shows it being added. Self-kudos and kudos on invisible activities are allowed. No rollback.
- **Severity:** High · **Fix:** Idempotent `PUT` kudos, `has_kudoed` per item, policy check, no self-kudos, a kudos list endpoint, optimistic update with rollback.
- **Acceptance:** Kudos state is correct after restart; double-tap yields 1 row; self-kudos is rejected.
- **Testing:** Integration + hook tests.

### F23 · Comments
- **Strava:** Add, delete own; flat thread (research §14).
- **Current:** Add only, unbounded length, allowed on invisible activities, the optimistic item never reconciles, no delete.
- **Severity:** Medium · **Fix:** Length limit, policy check, `DELETE` for author/owner, query-cache reconciliation.
- **Acceptance:** Author and owner can delete; 1,001 chars → 400; invisible activity → 404.
- **Testing:** Integration tests.

### F24 · Edit / delete activity
- **Strava:** ⋯ → Edit (title, sport, visibility, mute, …) and Delete (research §3, §13, §15).
- **Current:** No endpoints and no UI.
- **Severity:** High · **Fix:** `PATCH`/`DELETE /activities/:id` (owner only) and an edit screen reusing the save form; server recompute on sport change.
- **Acceptance:** The owner can change visibility and it takes effect immediately in feeds; delete removes the activity from all lists.
- **Testing:** Integration + E2E.

### F25 · User profile
- **Strava:** Name, photo, bio and counts are always visible; activities subject to privacy; profile privacy setting (research §12, §15).
- **Current:** Shows real counts and a recent activities list, but the endpoint leaks email, Google ID, physiology and raw tracks. New profiles get fabricated city, weight and HR values and the same stock avatar.
- **Severity:** High · **Fix:** `PublicAthleteDTO`; null physiology at sign-up; onboarding asks for name, city, weight (optional); initials avatar until R2.
- **Acceptance:** A contract test proves no PII leaks. A new user's profile shows only what they entered.

### F26 · Authentication
- **Current:** Production backdoor (`mock:` tokens, demo login), committed DB password, weak hashing, JWT secret fallback, email-linking takeover risk.
- **Severity:** Critical · **Fix:** ADR-13, ADR-24 (Google-only, rotated secrets, SecureStore).
- **Acceptance:** See SEC-01…06 in the audit.

### F27 · Settings in scope
- **Strava:** Units, default activity visibility, map visibility (hide start/end), auto-pause per sport, keep screen on (research §2, §8, §15).
- **Current:** The GPS settings screen is local state only. The privacy screen contains a hard-coded phone number and a dead beacon toggle. No default visibility or units setting.
- **Severity:** Medium · **Fix:** A server `user_settings` record mirrored in SQLite, read by the recorder and the save screen.
- **Acceptance:** Each setting changes behavior as specified; settings persist across reinstall (server) and work offline (local mirror).

---

## 3. Out-of-scope features currently in the app

| Feature | State | Recommendation |
|---|---|---|
| Clubs (+ clubs feed) | Works partially; the clubs feed leaks privacy | Hide; remove the clubs feed tab |
| Challenges | Progress updated on upload (count-based, no dedupe on retries) | Hide |
| Group events | Works partially; RSVP state only partially synced | Hide |
| Segments / leaderboards | Static seeded segments; no matching; fake KOM values in context | Hide |
| Routes / builder / navigation | Seeded routes; builder and navigation largely UI-only | Hide |
| Goals | Writes to the wrong user; unauthenticated delete (SEC-07) | Hide + unmount route |
| Messages | Basic DM implementation (not audited in depth) | Hide |
| Beacon | Backend exists; the record-screen toggle never starts a session | Hide |
| Analytics (fitness/freshness, race predictions, plans, heatmap, relative effort) | Mostly computed from little or no real data | Hide |
| GPX import / data export screens | Not functional end-to-end | Hide |

Hiding (not deleting) keeps the option to revive them after the core is solid (ADR-15).
