# Android background tracking: configuration, limits and device results

**Date:** 2026-11-20 · **Applies to:** `mobile-frontend/src/tracking/*`, `app.json`

## How recording works

| Piece | Where | What it does |
|---|---|---|
| Location task | `src/tracking/locationTask.ts` (imported first in `index.js`) | `TaskManager.defineTask` at module scope, so Android can start JS just to deliver fixes (headless). It writes every batch of fixes to SQLite through the engine. |
| Foreground service | `Location.startLocationUpdatesAsync(…, { foregroundService })` in `engine.ts` | Runs while recording, shows the "Recording run · GPS is on" notification, and keeps GPS alive with the screen off or the app in the background. `killServiceOnDestroy: false`. |
| Engine | `src/tracking/engine.ts` | Lifecycle `idle → preparing → recording ⇄ paused → completed` (pure reducer in `shared/tracking/lifecycle.ts`). Each transition is written to SQLite before it takes effect. Commands are serialized, so a Pause can't interleave with a fix being stored. |
| Local store | `src/tracking/db.ts` (`tracking.db`, WAL) | `sessions` (lifecycle, pauses, save details, sync state), `points` (every raw fix, `UNIQUE(session_id, t)`), `session_events` (start/pause/resume/finish/interrupted log), `acked_batches`. Fixes are stored only while status is `recording`, checked in the same exclusive transaction. |
| Metrics | `shared/tracking/*` | The same pure code runs live, on the Save screen and on the server (which recomputes from uploaded raw points). |
| Sync | `src/tracking/sync.ts` | Uploads after Save in 300-point batches. Idempotent on the server, retried with backoff, and nothing local is deleted until the server confirms. |

## Permissions (Android 14+ compliant)

`app.json` → `expo-location` plugin: `isAndroidForegroundServiceEnabled: true`, `isAndroidBackgroundLocationEnabled: false`. Generated manifest (verified after `expo prebuild`):

- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`: requested at Start ("While using the app").
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION`: required on Android 14+ for a `location`-type service. expo-location's service is declared with `foregroundServiceType="location"`.
- `POST_NOTIFICATIONS`: requested at Start on Android 13+. If it is denied, the service still runs but its notification is hidden.
- `ACCESS_BACKGROUND_LOCATION`: **deliberately removed** (`blockedPermissions`). A foreground service started while the app is visible keeps "while in use" access with the screen off, and expo-location's native code skips the background-permission check when `foregroundService` is set (`LocationModule.kt`, `startLocationUpdatesAsync`). This avoids the "Allow all the time" prompt and Google Play's background-location review.
- Android only lets the service start while the app is in the foreground (`ForegroundServiceStartNotAllowedException`). Start and Resume are on-screen buttons, so this always holds.

Development build only: `expo-task-manager` and the foreground service need native code. Expo Go can't verify this. Build with `npx expo run:android` (or EAS).

## What Android can still do to a recording

| Situation | Expected behaviour | Recovery |
|---|---|---|
| Screen off / app in background | Service keeps delivering fixes. JS stays alive because of the foreground service. | — |
| App swiped from recents | Service survives (`killServiceOnDestroy: false`); fixes go to the headless task. | Reopening the app shows the running recording. |
| **Force stop** (Settings → Force stop) | Android kills everything, including the service. **No app can record after a force stop.** | On next launch the session is RECORDING with no running service, so it becomes PAUSED(`interrupted`) at the last fix. The banner says "Recording interrupted · Resume or finish". The gap counts as paused time. |
| OEM battery killers (Xiaomi, Huawei, Samsung "sleeping apps") | May kill the service despite the notification. | Same interruption recovery. Users should exempt the app from battery optimization (Strava gives the same advice). **Not yet in-app.** |
| Reboot | Service is gone. | Interruption recovery on the next launch. |
| Location turned off mid-activity | No fixes. The status strip shows "GPS SIGNAL LOST" after 15 s. | Distance resumes when fixes return. A gap > 10 s never counts as moving time. |

## Device results
See the Phase 3 entry in [STRAVA_TECHNICAL_AUDIT.md §13](STRAVA_TECHNICAL_AUDIT.md#13-status-updates) and the test log below.
