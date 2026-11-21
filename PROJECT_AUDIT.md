# PROJECT_AUDIT.md

Status words: Identified, Root Cause Found, Fix Implemented, Automated Tested, API Verified, Database Verified, Physical Device Verified, Deployment Verified, Blocked, Not Fixed.

Last updated: 2026-11-21. Session 1 of the full audit. Only the map redesign was implemented in this session. The rest of the feature audit is NOT done (see the continuation checklist).

## Environment facts (verified this session)
- Frontend: Expo 58 / React Native 0.88, `@maplibre/maplibre-react-native` 11.5.1 (native MapLibre, already installed, so no migration needed).
- Backend: Cloudflare Worker (Hono, Drizzle). Production: `https://open-strava-backend.rakib2020-tkg.workers.dev/api/v1`.
- `tsc --noEmit` (frontend and backend): clean.
- Frontend jest: 10 suites, 66 tests, all pass (includes the new map style test).
- Backend vitest: 8 files, 100 tests, all pass (local, not against production).
- ESLint (frontend): 8 errors and about 34 warnings, all in files this session did not touch except as listed below. They existed before (`use-color-scheme.web.ts`, `groups.tsx`, `login.tsx`, `messages/[id].tsx`, `routes/[id].tsx`, `useMapRoutes.ts`, `goals.tsx`). They are Not Fixed. I did not confirm whether my edits added warnings.
- Android build/install: Blocked. A device was listed at the start (`192.168.0.102:34435`). I started `expo run:android`, but the build process ended and the device had disappeared from `adb devices` when I checked. No build output was saved, and I don't know whether the build finished. Nothing was confirmed installed.

## Map redesign (module E)

### Inspection findings
| Item | Finding |
| --- | --- |
| Rendering library | MapLibre Native v11 via `src/components/map/MapView.tsx` (the single map component). `StravaMapView` is a thin adapter on top of it. |
| Tile provider / style | OpenFreeMap, default style `liberty`. Liberty has 3D building extrusions and many POIs. This is the look that was disliked. |
| Style plumbing | `MAP_STYLES` in `mapTypes.ts`. Selectors in `record.tsx` and `maps.tsx` with duplicated hard-coded lists, plus a `heatmap.tsx` selector. |
| 3D | "3D" button and `pitch` prop on record and maps (pitch 55 turned on Liberty extrusions). |
| Location markers | Native `<UserLocation>` puck in live mode or when `showUserLocation` is set. A custom GeoJSON blue dot (3 circle layers) also existed for the case where a position was known but no puck was shown. `RoutePreview` (feed cards, history) passed `showUserLocation` and drew a puck on static route thumbnails, which is wrong. |
| Accuracy circle | `accuracy={false}` was already set. |
| Start marker | Green start/end markers are drawn only in `route` mode, never in `live` mode. Not over the current location. |
| Route line | Orange (`color.brand`) with white casing. |
| Camera | Live mode uses `trackUserLocation='default'`. A manual pan fires `onTrackUserLocationChange(null)`, which sets `following=false`. The recenter button sets it back to true. |
| Discovery overlays | Nearby routes, planned route, markers, other routes are drawn only when props are passed. Record passes only `plannedRoute` (a route the user chose). |

### Changes (Fix Implemented, Automated Tested for config only)
- `mapTypes.ts`: styles are now `positron` (default), `bright`, `voyager` (CARTO). `liberty` is removed. Added `DEFAULT_MAP_STYLE`, `MAP_STYLE_OPTIONS` (one list shared by every selector), and `toMapStyleKey` (legacy or unknown values fall back to Positron).
- `MapView.tsx`: default style is Positron, and `EXPO_PUBLIC_MAP_STYLE_URL` overrides only the default. Removed `pitch` and the tilt effect. `touchPitch` is off, so the map is flat 2D. Removed the custom blue-dot layers, so the native puck is the only location marker. Removed the camera ref. Casing width 9 to 8.
- `RoutePreview.tsx`: no puck on static previews, and the Liberty style is gone.
- `StravaMapView.tsx`: style key goes through `toMapStyleKey`.
- `record.tsx`, `(tabs)/maps.tsx`: removed 3D state and button, use `MAP_STYLE_OPTIONS`, default style is Positron.
- `RecordHeaderControls.tsx`, `MapFloatingControls.tsx`: removed the 3D button and the fake "2" badge on the layers button.
- `analytics/heatmap.tsx`: style pills are positron, bright, voyager.
- `(tabs)/maps.tsx`: the recenter button did nothing, because it re-set the same position and the camera key didn't change. Added `recenterNonce` to `frameKey`. Not tested.
- New test: `src/components/map/__tests__/mapStyles.test.ts`.

### Provider conditions (checked)
- OpenFreeMap Positron and Bright style JSON return HTTP 200 and use the `openmaptiles` source. Terms (https://openfreemap.org/tos/): free service, no key, attribution required, offered as-is with no SLA. They ask heavy users to get in touch. Production risk: no SLA.
- CARTO Voyager style JSON returns HTTP 200. CARTO's free basemap terms are non-commercial, so a commercial release needs a CARTO licence. That is why it is only an alternative and never the default. I read this from my own knowledge of CARTO's terms and did not re-read their current terms page.
- Attribution stays on (`attribution` prop on `<Map>`).

### Status
- Positron default, no extrusions, flat 2D: Fix Implemented, Automated Tested (config only). **Not Physical Device Verified. The new look has not been seen on a phone or in an emulator.**
- Single marker, orange route, camera follow, Discovery overlays: Fix Implemented (code review only). Not Physical Device Verified.
- Remaining limitation: the Positron style from OpenFreeMap has no building footprints in some zooms. This is unconfirmed until it is viewed. If building footprints are wanted, a style override via `EXPO_PUBLIC_MAP_STYLE_URL` is the extension point.
- Remaining limitation: `routes/navigation.tsx` and `routes/[id].tsx` pass `styleKey="positron"` and still work.
- Remaining limitation: "Bright" and "Voyager" were not visually evaluated.

## GPS (module D) — inspected only
- `shared/tracking` filter: rejects invalid, low-accuracy (over 25 m), stale and impossible-speed fixes. `TrackAccumulator` advances distance only after 3 consecutive fixes leaving the accuracy circle on a stable heading, which is aimed at stationary jitter.
- Automated tests (`tracking.test.ts`, `sync.test.ts`) pass. They use simulated points. **Not Physical Device Verified.**
- Not inspected in depth: background task (`locationTask.ts`), pause/resume across backgrounding, GPS signal loss, route persistence in SQLite, and Android permission flows.

## Messaging (module C)
- `POST /api/v1/messages/send` on production returns 401 without a token (not 404). The route is deployed. API Verified for existence only.
- `GET /api/v1/messages` returns 404, which is expected because no such route is mounted.
- Authenticated behaviour (conversation id vs recipient id) is covered by local backend tests that pass. It was not tested against production because I have no credentials. Not Deployment Verified. Realtime WebSocket delivery is unverified.

## Not audited in this session (do not treat as verified)
Authentication details (Google sign-in, refresh, multi-account), kudos/comments consistency, activity publish/edit/delete across Home/Profile/History, pagination, clubs, events, challenges, profile/history stats, notifications, segments, goals, privacy zones, beacon, search, routes builder/planning. The existing `AUDIT.md` claims fixes for several of these. I have not re-verified them beyond the passing local test suites.

## Continuation checklist
1. Reconnect the phone (`adb devices`), run `npx expo run:android` in `mobile-frontend`, and save the log. Inspect Record (idle, recording, stationary, moving, pause/resume, finish), Maps, activity detail, feed preview cards. Then mark the map items Physical Device Verified or fix what you see.
2. Walk module by module (A, B, F, G, H, I, J, K): reproduce, trace UI to cache to API to DB, fix, add a regression test, update this file.
3. Obtain a test account and token to run authenticated API checks against production for messages, activities, events, and clubs. Confirm the deployed worker matches the local code (`wrangler deploy` needs your authorization).
4. Fix or triage the 8 pre-existing ESLint errors.
5. Test GPS on foot and in a vehicle, including screen lock and signal loss.
