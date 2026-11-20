# Strava Product Research

**Date:** 2026-11-19
**Purpose:** Establish how the real Strava app behaves for the features in our MVP scope, so implementation decisions are evidence-based.

**How to read this document**
- 🟢 **Official:** stated on `support.strava.com` or `developers.strava.com`, with the URL cited.
- 🟡 **Unconfirmed:** commonly believed or seen only in a search snippet / secondary source. Do not treat it as a spec.
- 🔵 **Our recommendation:** an engineering decision for *our* app. It is not a claim about Strava's internals.

We do **not** know Strava's proprietary implementation (algorithms, thresholds, filtering). Where Strava publishes only a behavior ("a speed threshold"), we choose our own parameters and say so.

Sources were read in November 2026. Some help-center pages blocked automated fetching; those are marked "(snippet)", meaning only the official page's search-result excerpt was available.

### Mapping of requested topics to sections

| # | Requested topic | Section |
|---|---|---|
| 1–4 | Running, walking, hiking, cycling tracking | §1 |
| 5–6 | GPS recording, background location | §2 |
| 7–9 | Live maps, route recording, start/pause/resume/finish | §3 |
| 10–13 | Distance, moving/elapsed time, speed, pace | §4, §5 |
| 14 | Elevation gain | §6 |
| 15 | Calories | §7 |
| 16 | Auto-pause | §8 |
| 17–18 | Activity recovery, offline recording | §9 |
| 19 | Activity summary and details | §10 |
| 20 | Activity history | §11 |
| 21–22 | Profile, following/followers | §12 |
| 23 | Activity feed | §13 |
| 24 | Kudos and comments | §14 |
| 25 | Activity privacy | §15 |
| — | Data model reference (Strava API) | §16 |

---

## §1. Sport types: Run, Walk, Hike, Ride

### Official behavior 🟢
- Supported sports are grouped as: **Foot** (Run, Hike, Trail Run, Wheelchair, Walk), **Cycle** (Ride, E-Bike Ride, Mountain Bike Ride, Gravel Ride, …), and Water, Winter and Other groups. Everything except virtual activities can be recorded in the app. Outdoor sport types show a map. Some features are limited to the three core sports (ride, run, swim). [support: supported sport types](https://support.strava.com/en-us/articles/15402005-supported-sport-types-on-strava)
- The API `SportType` enum includes `Run`, `TrailRun`, `Walk`, `Hike`, `Ride`, `MountainBikeRide`, `GravelRide`, `EBikeRide`, and more. The older `type` field is deprecated in favor of `sport_type`. [developers: reference](https://developers.strava.com/docs/reference/)
- The record screen preselects the **last-used sport**; the user changes it with the sport icon next to Start. [support: how to record](https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava)
- **Sport affects display:** runs show pace (min/km), rides show speed (km/h) ([pace vs speed](https://support.strava.com/en-us/articles/15401806-pace-speed)). Live elevation is shown for Hike, Trail Run and cycling types ([how to record](https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava)). Calories are estimated only for rides, runs, walks and hikes (§7). Auto-pause differs by sport (§8).
- The sport can be changed on the save screen or later via **Edit**, which can change analysis. [support: change activity type](https://support.strava.com/en-us/articles/15401975-change-activity-type)

### User interaction flow
Record tab → (sport preselected: last used) → optionally tap the sport icon → pick → Start.

### Required data
`sport_type` (enum), stored on the session and the activity. A per-user `last_sport_type` preference.

### Expected behavior in our app 🔵
- MVP sports: **Run, Walk, Hike, Ride** (four values, an enum in the DB and in shared types). Optionally add **Trail Run** and **Mountain Bike Ride** later as display variants that share Run/Ride metric rules.
- One **sport config table** drives everything: `{ primaryMetric: 'pace'|'speed', autoPauseDefault, movingSpeedThreshold, maxPlausibleSpeed, showsLiveElevation, metFunction }`.
- Remember the last sport.

### Edge cases
- Changing the sport after recording must recompute calories and the pace/speed display (server recompute on PATCH).
- The current UI maps "Swim" and "Surf" to `Workout` (wrong). Remove non-GPS sports from MVP.

---

## §2. GPS recording and background location

### Official behavior 🟢
- **Android battery optimizations stop recording.** Strava's Android troubleshooting tells users to turn off Power Saving / Battery Optimization for Strava, to allow Strava to use GPS **in the background**, and to set location mode to High accuracy. It provides OEM-specific steps (Samsung, Xiaomi, Huawei, OnePlus, …). [support: Android GPS issues](https://support.strava.com/en-us/articles/15402062-troubleshooting-android-gps-issues)
- The "Strava stops recording when the screen is off" guidance is: update the app and OS, add Strava as a protected app, and disable energy optimization. (snippet) [support 216942547](https://support.strava.com/hc/en-us/articles/216942547)
- The record screen has **Display settings** to keep the screen on. A **GPS strength halo** around the user's position shows signal quality (smaller is better). [support: how to record](https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava)
- Recording uses little data. Sync is about 1 MB per 2 hours. [same]
- Bad GPS cannot be repaired after the fact except by cropping or "Correct Distance" (web). (snippet) [support: bad GPS data](https://support.strava.com/en-us/articles/15402181-bad-gps-data)
- iOS guidance: wait a few minutes after "GPS Signal Acquired" for best accuracy, and compare against fitness apps, not navigation apps (which snap to roads). [support: iOS GPS](https://support.strava.com/hc/en-us/articles/216917247-Troubleshooting-iOS-GPS-Issues)

### Platform facts (Expo SDK 58 docs) 🟢
- `watchPositionAsync`: *"Updates will only occur while the application is in the foreground. To get location updates while in background you'll need to use `startLocationUpdatesAsync`."* [Expo Location v58](https://docs.expo.dev/versions/v58.0.0/sdk/location/)
- Background tracking requires `TaskManager.defineTask` in **global scope** (in Expo Router: a separate `tasks.ts` imported at the top of the root `_layout.tsx`). [Expo TaskManager v58](https://docs.expo.dev/versions/v58.0.0/sdk/task-manager/)
- Config plugin: `isAndroidBackgroundLocationEnabled` adds `ACCESS_BACKGROUND_LOCATION`. `isAndroidForegroundServiceEnabled` (defaults to true when background is enabled) adds `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION`, the latter *"required on Android 14 and later"*. `locationAlwaysAndWhenInUsePermission` is **iOS-only**.
- On Android 11+, `requestBackgroundPermissionsAsync` **opens system settings**, so an explanation must be shown first. Foreground permission must be granted before background.
- *"Background location will stop if the user terminates the app."* A terminated app is not restarted on location events.
- TaskManager and foreground services are **not available in Expo Go on Android**. A development build is required.
- `coords.altitude` is height above the **WGS-84 ellipsoid**, not mean sea level.

### User interaction flow
First record → explain "why background location" → grant foreground → grant background (Settings page on Android 11+) → (optional) battery-optimization guidance → record. While recording: an ongoing notification ("Recording Run · 3.2 km · 18:04").

### Required data
Per fix: timestamp, lat, lng, horizontal accuracy, altitude, altitude accuracy, speed (Doppler, may be null), heading (optional).

### Expected behavior in our app 🔵
- Use `startLocationUpdatesAsync` with a foreground service and `BestForNavigation` accuracy at ~1 s intervals. The task writes batches to SQLite.
- A pre-start GPS state: "Acquiring GPS…" until a fix with accuracy ≤ 20 m arrives. Show an accuracy indicator.
- Keep raw points and apply filters at metric computation time.
- A "Recording reliability" helper screen that deep-links to battery optimization settings, mirroring Strava's support guidance.

### Edge cases
Signal loss in tunnels or under tree cover (gap handling: do not interpolate distance across gaps > N s; mark the gap). Permission revoked mid-activity. Location services toggled off mid-activity. OEM killers (Xiaomi/Huawei/Samsung). Battery saver mode. Initial fixes that are cached or coarse. Clock changes.

---

## §3. Recording screen: live map, start, pause, resume, finish, discard, save

### Official behavior 🟢
- **Start** button. For GPS activities the user **toggles between a map view and a stats view** (minimize icon or swipe). A bottom sheet holds Beacon, sensors, and More (display settings, audio cues, auto-pause). [support: how to record](https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava)
- **Manual pause always requires manual resume**, even with auto-pause on. [support: auto-pause](https://support.strava.com/en-us/articles/15402141-auto-pause)
- **Finish** opens the save screen. **Save** uploads, and the activity appears in the feed immediately, with full details after sync. **Discard** needs confirmation and is unrecoverable. [support: how to record]
- Save screen: title, description, photos, **sport type** (changeable), **privacy/visibility**, **Hidden Details** (hide stats), and **perceived exertion** ("How did that activity feel?", 1–10 from Easy to Max Effort). [change type](https://support.strava.com/en-us/articles/15401975-change-activity-type) · [hide details](https://support.strava.com/hc/en-us/articles/360028654291-Hide-Details-from-your-Activities) · [perceived exertion (snippet)](https://support.strava.com/hc/en-us/articles/360032535512-Perceived-Exertion)
- 🟡 The exact paused-state layout ("Resume" and "Finish" side by side) is unconfirmed from text. Whether Mute and Gear appear on the first save screen (vs only in Edit) is unconfirmed.
- 🟡 Default titles of the form "Morning Run" / "Afternoon Ride" are widely observed but not documented in the articles we read.

### User interaction flow 🔵
`Idle → Acquiring GPS → [Start] → Recording ⇄ [Pause]/[Resume] → Paused → [Finish] → Save screen → [Save] → Activity detail (pending/uploaded)`, with `[Discard] (confirm) → Idle` available from Paused and from the Save screen.

### Required data
Session: client UUID, sport, state, `started_at`, pause intervals, segments (one per resume), points. Save input: title, description, sport, visibility, perceived exertion (optional), hide-from-home (optional).

### Expected behavior in our app 🔵
- Two views: **Stats** (big numbers) and **Map** (live route polyline, user-follow camera, GPS halo). Both are always available.
- Paused state: **Resume** (primary) and **Finish** (secondary). **Discard** sits behind Finish → Save screen or behind a menu, always with confirmation.
- Android back button while recording does **not** exit or discard. It minimizes to the app with recording continuing (notification remains).
- Default title: time-of-day + sport, e.g. "Morning Walk" (05:00–11:59 Morning, 12:00–16:59 Afternoon, 17:00–20:59 Evening, else Night).
- Save is local-first (§9): it never blocks on network.

### Edge cases
Finish with < 10 m or < 30 s → warn ("This activity is very short. Save anyway?"). Very long sessions (> 12 h). Double-tap on Save. App killed between Finish and Save (must be recoverable as "finished, unsaved").

---

## §4. Distance, moving time, elapsed time

### Official behavior 🟢
- **Distance** from GPS connects recorded points. It is **2D** (ignores vertical movement). It is computed after upload if the file has no distance stream. "Correct Distance" (web) recalculates and removes outliers. Battery saving can reduce accuracy. [support: how distance is calculated](https://support.strava.com/hc/en-us/articles/216919487-How-Distance-is-Calculated)
- **Elapsed time:** *"the duration from the moment you hit start … to the moment you finish the activity."* [support: moving time](https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations)
- **Moving time:** estimated using *"a speed threshold to determine whether or not you are resting."* The threshold value is **not published**. For runs, if the file contains pause events, the server does not remove additional resting time. Races (tagged) use elapsed time. Summary views prioritize moving time; detail shows both. [same] · [moving time calculations](https://support.strava.com/hc/en-us/articles/115001188684-Moving-Time-Calculations)
- 🟡 A Strava Engineering blog snippet mentions removing stretches below the threshold for **> 15 s** as resting. Unverified and possibly outdated.

### Required data
Ordered points with timestamps. Pause intervals. Segment boundaries.

### Expected behavior in our app 🔵
- **Distance** = Σ haversine between consecutive *accepted* points **within a segment** (never across pause boundaries). 2D, like Strava.
- **Elapsed** = `finished_at − started_at` (wall clock, includes pauses), matching Strava's definition.
- **Moving time** = Σ Δt over consecutive accepted points where segment speed ≥ the sport threshold, with Δt capped (e.g. 10 s) so GPS gaps don't count as moving. Manual pauses are excluded. Our thresholds (tunable): Run 0.9 m/s, Walk/Hike 0.5 m/s, Ride 1.0 m/s, with a 15 s rest window inspired by the unconfirmed Strava rule.
- The server recomputes distance and moving time from the uploaded points and stores the authoritative values. The client value is used for live display.

### Edge cases
Stationary drift (§2). Pauses in which the user moved. Clock skew (use device monotonic ordering, reject non-increasing timestamps). Elevators or trains (implausible speed for the sport → rejected).

---

## §5. Speed and pace: current vs average; splits

### Official behavior 🟢
- Pace for running (min/km or min/mi); speed for cycling (km/h or mph). [pace vs speed](https://support.strava.com/en-us/articles/15401806-pace-speed)
- Averages generally use **moving time**. [moving time](https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations)
- Live display: **runs show split average pace**; **rides show current speed while moving and average speed while paused**. [how to record](https://support.strava.com/en-us/articles/15402137-how-do-i-record-an-activity-on-strava)
- Splits are auto-generated every km or mile per the unit preference. [run activity pages](https://support.strava.com/hc/en-us/articles/216919567-Run-Activity-Pages)
- API `Split`: `distance`, `elapsed_time`, `moving_time`, `average_speed`, `elevation_difference`, `split`. `splits_metric` and `splits_standard` exist on DetailedActivity. [developers: reference](https://developers.strava.com/docs/reference/)
- Some analysis (pace zones, workout analysis) is subscriber-only and **out of our scope**. GAP is shown for runs. GAP is out of our scope; the current code labels plain pace as "GAP", which must be removed.

### Expected behavior in our app 🔵
- Avg speed = distance / moving time. Avg pace = moving time / distance.
- **Current pace/speed** = smoothed over the last ~10–15 s of accepted points (raw per-fix values are too noisy for pace display).
- Splits computed post-hoc with interpolated boundary crossings: per split, distance, moving time, elapsed time, avg speed, elevation difference. Include the final partial split.
- Units preference: metric/imperial. Store SI units (m, s, m/s) everywhere and convert only for display.

---

## §6. Elevation gain

### Official behavior 🟢 [support: elevation FAQs](https://support.strava.com/en-us/articles/15402093-elevation-on-strava-faqs)
- For phones / devices without a known barometer, Strava shows **"corrected elevation"**: GPS positions are cross-referenced with an elevation **basemap**.
- Climbing must occur consistently for **> 10 m** (non-barometric) or **> 2 m** (barometric) to count. This is Strava's documented smoothing threshold.
- Live elevation on Android uses GPS. Values may change after upload correction.
- Elevation change during a pause still counts toward gain.

### Expected behavior in our app 🔵
- MVP: compute gain from GPS altitude using **filtering** (drop fixes with altitude accuracy > ~10 m), **smoothing**, and **hysteresis at 10 m**, aligned with Strava's documented non-barometric threshold. Expect under-counting on gentle rolling terrain; that is preferable to the current noise-driven over-counting.
- Later (post-MVP): server-side DEM lookup (e.g. an SRTM/Copernicus DEM tiled in R2) to replicate the "corrected elevation" approach.
- Do not show absolute altitude prominently (it is ellipsoid height on Android, so it can be off by tens of metres).

---

## §7. Calories

### Official behavior 🟢 [support: calories](https://support.strava.com/en-us/articles/15402159-how-does-strava-calculate-calories)
- If a device or partner provides calories, Strava shows them. Otherwise Strava estimates them **only for rides, runs, walks and hikes**.
- **Rides:** from power (measured or estimated from athlete and bike weight) × a human efficiency coefficient.
- **Runs:** require athlete **weight**. Use grade-adjusted speed, weight and moving time, scaled by a factor.
- Walk/hike: calculated, formula not published. Changing your weight changes Strava-computed calories.
- 🟡 Heart-rate-based calories and behavior when weight is missing are not covered by the article.

### Expected behavior in our app 🔵
- We **cannot** replicate Strava's model and do not claim to. Use the **MET method**: `kcal = MET(sport, avgMovingSpeed) × weightKg × movingHours`, with MET values from the Compendium of Physical Activities (speed-banded for run, walk and ride; a fixed value for hiking). Label it "Estimated".
- Require weight for an estimate. If missing, use a documented default (70 kg) and show a one-time prompt to add weight. **Do not** silently invent profile weights (the current code sets 68 kg for everyone).
- One shared function on client and server; the server value is authoritative and recomputed on sport or weight change.

---

## §8. Auto-pause

### Official behavior 🟢 [support: auto-pause](https://support.strava.com/en-us/articles/15402141-auto-pause)
- Settings on the record screen: **off / runs only / rides only** (and both).
- **Rides:** GPS movement detects rest. **On by default for cycling.**
- **Runs:** uses the phone's **accelerometer** to detect running motion.
- Manual pause always needs manual resume.
- With auto-pause off, moving and resting time are computed at upload.
- Strava advises **turning auto-pause off for walks and hikes** (slow speeds cause false pauses). (snippet) [support: auto-pause issues](https://support.strava.com/hc/en-us/articles/216929827-Having-issues-with-Auto-Pause-for-the-mobile-app-)
- Pause indoors manually; blocked GPS can falsely resume. Numeric thresholds are **not published**.

### Expected behavior in our app 🔵
- Setting per sport. Defaults: **Ride on; Run, Walk, Hike off**.
- MVP detection is GPS speed with hysteresis (pause after < threshold for ≥ 4 s, resume after > threshold for ≥ 2 s). Accelerometer-based run detection is post-MVP.
- Auto-pause affects the live timer UX. Moving time on the summary is computed independently (§4), so results are consistent whether or not auto-pause was on.

---

## §9. Activity recovery and offline recording

### Official behavior 🟢
- **Recording offline is supported for everyone.** GPS data is saved on the phone and **uploads automatically** when connectivity returns. [support: Strava offline](https://support.strava.com/en-us/articles/17699138-how-do-i-use-strava-offline)
- Stuck uploads: iOS shows **"Pending Uploads"** with **Retry**. Android shows **"Unsync'd Activities"** with **Sync**, **Delete**, and **export as GPX**. Low storage can block sync. [support: troubleshooting syncing](https://support.strava.com/hc/en-us/articles/216919037-Troubleshooting-Syncing)
- (These two articles conflict: the offline article says there is no manual way to sync if an upload fails. The syncing article describes manual retry.)
- Discarded activities are unrecoverable. Saved-then-deleted activities can be restored for **30 days** from the website. (snippet) [support: restore deleted](https://support.strava.com/en-us/articles/15401877-how-to-restore-a-deleted-activity)
- 🟡 **In-progress recovery after a crash or app kill is not documented** by Strava.

### Expected behavior in our app 🔵
- **Local-first save:** Save writes the finished activity to SQLite with status `pending_upload` and returns immediately. A sync worker uploads on foreground, on connectivity regained, and on manual Retry. Only a 2xx response marks it uploaded.
- "Pending upload" badge in the user's activity list, with **Retry** and **Delete** (with confirmation), mirroring Strava's Unsync'd Activities.
- **Idempotent upload** via a client-generated activity UUID (see §16 `external_id`), so retries never duplicate.
- **Crash recovery (our requirement):** on launch, a session in state `recording`/`paused` → "We recovered an unfinished Run (5.2 km). Resume / Finish / Discard". A session in state `finished` → open the Save screen.
- Soft delete with 30-day restore is **post-MVP** (hard delete with confirmation is fine for MVP).

---

## §10. Activity summary and details

### Official behavior 🟢 [support: viewing activities](https://support.strava.com/en-us/articles/15401981-viewing-activities) · [run activity pages](https://support.strava.com/en-us/articles/15401883-run-activity-pages)
- Tapping a feed item opens the activity: map, stats, description, kudos, comments. Tapping the map opens a full-screen map. Runs show splits and best efforts. "View Analysis" shows elevation, pace/speed, and HR. Subscriber analysis is out of scope.
- API detail fields: `kudos_count`, `comment_count`, `has_kudoed`, `photos`, `description`, `splits_metric`, … [developers: reference](https://developers.strava.com/docs/reference/)

### Expected behavior in our app 🔵 (MVP detail screen)
Header (athlete, date and time, which may be hidden from non-followers per §15, sport icon, title, description) → interactive map (masked polyline for non-owners) → stats grid: **Distance, Moving time, Elapsed time, Avg pace or Avg speed, Max speed (ride), Elevation gain, Calories (estimated)** → splits table (runs/walks/hikes; per km) → elevation chart → kudos (count, avatars, give-kudos button) → comments (list, add, delete own). Owner menu: Edit, Delete.

Edge cases: activity without GPS (no map section). Hidden details. Activity becomes invisible (404 → "This activity is not available").

---

## §11. Activity history

### Official behavior 🟢 [support: activity history](https://support.strava.com/en-us/articles/15402014-viewing-your-activity-history-on-strava)
- Mobile: **You → Activities** (searchable list) and **You → Progress** (sport selector, weekly/monthly bar graph of time, distance and elevation). Training Log is subscriber-only and out of scope. [training log](https://support.strava.com/en-us/articles/15402077-training-log)

### Expected behavior in our app 🔵
- Profile → Activities: paginated list of **all own activities** (every visibility) + local pending ones. Others' profiles show only what the viewer may see.
- Profile → Progress: totals by sport for this week, this year and all-time, plus a 12-week bar chart. Computed server-side from the user's own activities.

---

## §12. Profile, following, followers

### Official behavior 🟢
- Following adds the athlete's activities to your feed. You can **favorite** athletes (they surface higher) or **mute** them (hidden from your feed, they aren't notified). [support: following](https://support.strava.com/hc/en-us/articles/115000173484-Following-Athletes-on-Strava)
- If **Profile Page privacy = Followers**, people must **request to follow and be approved**. Requests can be denied. [support: privacy controls](https://support.strava.com/en-us/articles/15401951-privacy-controls) · [privacy FAQ](https://support.strava.com/en-us/articles/15401776-strava-s-privacy-controls-faq)
- Always visible to members: name, photo, bio, follower/following counts. [privacy defaults](https://support.strava.com/en-us/articles/15401763-your-privacy-defaults-when-you-create-a-strava-account)
- Follow limit 2,000 (snippet). Removing a follower revokes followers-only access and they aren't notified. **Blocking** removes the follow both ways and prevents viewing activities. [support: manage followers](https://support.strava.com/en-us/articles/15402163-how-do-i-manage-my-followers-and-block-athletes-on-strava)

### Expected behavior in our app 🔵
- MVP: public profiles, **auto-approved follows**, follow/unfollow, followers and following lists, user search (authenticated). Phase 4: follow approval (private profile), remove follower, block.
- Public profile DTO: name, username, avatar, city, bio, counts, follow state. **Never** email, Google ID or physiology.

---

## §13. Activity feed

### Official behavior 🟢 [support: feed ordering](https://support.strava.com/en-us/articles/15402105-feed-ordering)
- Two orderings: **Personalized** (ranked) and **Latest Activities** (chronological by **end time** = start + elapsed). Your own feed and club feeds are always chronological.
- Out-of-order causes include long activities ending later, late uploads, privacy changed to public, and time zones. (snippet)
- **Only You** activities never appear in feeds. [support: activity privacy](https://support.strava.com/en-us/articles/15401987-how-do-my-activity-privacy-controls-work-on-strava)
- **Mute activity** (`hide_from_home`) removes an activity from home and club feeds but keeps it on the profile and in stats. Set per activity in Edit. [support: mute](https://support.strava.com/en-us/articles/15401718-mute-activity)

### Expected behavior in our app 🔵
- Home feed = own activities + followed athletes' activities that the viewer may see (PUBLIC, plus FOLLOWERS_ONLY when following), excluding others' muted activities. Ordered by **end time desc** ("Latest"). Personalized ranking is out of scope.
- Cursor pagination on `(end_time, id)`.
- Feed card: avatar, name, date, sport, title, **static route preview** (simplified polyline), 3 key stats (distance, pace or speed, time), kudos count + give button, comment count.
- An optional "Discover" tab (public activities) is post-MVP and needs moderation thinking.

---

## §14. Kudos and comments

### Official behavior 🟢
- Kudos is a thumbs-up on an activity, given from the feed or detail. The icon turns orange. Tapping the count lists who gave kudos. **"No takebacks!"** (cannot undo). [support: kudos](https://support.strava.com/en-us/articles/15402054-what-is-kudos)
- Comments on activities. **You can delete your own comment** (app: ⋯ → Delete). Commenting or giving kudos subscribes you to the thread. Blocking hides comments both ways. [support: comments](https://support.strava.com/en-us/articles/15402008-how-do-i-give-and-receive-comments-on-strava)
- 🟡 Unconfirmed: self-kudos rules, owner deleting others' comments, comment edit and length limits, and "only viewers can kudo/comment" (logically implied by privacy).

### Expected behavior in our app 🔵
- Give-only, idempotent kudos. No self-kudos. Only users who can view the activity can kudo or comment (backend enforced).
- Flat comments, ≤ 1,000 chars. The author can delete; the activity owner can also delete (moderation). No editing in MVP.
- Notifications to the owner for kudos and comments (deduplicated).

---

## §15. Activity privacy

### Official behavior 🟢 [support: activity privacy](https://support.strava.com/en-us/articles/15401987-how-do-my-activity-privacy-controls-work-on-strava)
| Visibility | Who can see | Notes |
|---|---|---|
| **Everyone** | Any member; limited logged-out web view | **Start time and bike are hidden from non-followers.** Photos to non-followers only if the profile is Everyone. Appears on leaderboards. |
| **Followers** | Followers only | Non-followers can't open it. Excluded from profile stats non-followers see. |
| **Only You** | Owner only | Not on profile or club feeds. Not in stats others see. |

- A **default visibility** applies to new uploads (not retroactive). Per-activity changes happen via Edit. Bulk "Edit Past Activities" exists (snippet). There is no per-follower granularity.
- **New-account defaults:** profile Everyone, activities Everyone, **map: first and last 200 m hidden** by default for app-recorded activities. [privacy defaults](https://support.strava.com/en-us/articles/15401763-your-privacy-defaults-when-you-create-a-strava-account)
- **Map visibility** (snippet) [support: map visibility](https://support.strava.com/en-us/articles/15402012-how-do-i-edit-my-map-visibility-on-strava):
  - Hide the start/end around specific addresses (up to 1 mi; retroactive).
  - Hide the start/end of all activities (future).
  - Hide the entire map.
  - A per-activity override is available.
- **Hidden Details:** hide start time, pace, speed, calories, power, HR, per activity or by default. [support: hide details](https://support.strava.com/hc/en-us/articles/360028654291-Hide-Details-from-your-Activities)
- API scopes: `activity:read` returns Everyone + Followers activities **"excluding privacy zone data"**. `activity:read_all` adds Only You activities and privacy-zone data. [developers: authentication](https://developers.strava.com/docs/authentication/)

### Expected behavior in our app 🔵 (MVP)
- Three visibilities, enforced **server-side in one policy function** on every read path (detail, feed, profile list, stats, kudos, comments, export).
- **Default visibility setting** per user (default Everyone, as Strava).
- **Hide start/end 200 m by default** for non-owners (masked polyline computed server-side). Optional privacy zones later.
- Non-followers never see the exact start time of an Everyone activity: show the date only. 🔵 This is a direct adoption of Strava's documented rule.
- Hidden Details: post-MVP (keep in the backlog).

---

## §16. Data model reference: Strava API (for our schema design)

🟢 From [developers: reference](https://developers.strava.com/docs/reference/) and [uploads](https://developers.strava.com/docs/uploads/):

| Strava field | Meaning | Our column (🔵) |
|---|---|---|
| `sport_type` | enum | `sport_type` enum |
| `distance` | metres, float | `distance_m` numeric |
| `moving_time`, `elapsed_time` | seconds, int | `moving_time_s`, `elapsed_time_s` |
| `total_elevation_gain`, `elev_high`, `elev_low` | metres | `elevation_gain_m`, `elev_high_m`, `elev_low_m` |
| `average_speed`, `max_speed` | m/s | `avg_speed_mps`, `max_speed_mps` |
| `calories` | kcal | `calories_kcal` |
| `start_date`, `start_date_local`, `timezone` | UTC + local | `start_time` (timestamptz) + `timezone` (IANA) |
| `start_latlng`, `end_latlng` | | (owner-only) |
| `map.summary_polyline` | encoded, simplified | `summary_polyline` (encoded, masked) |
| `map.polyline` | detailed | stream table or R2 object (owner gets raw, others masked) |
| `hide_from_home` | muted | `hide_from_home` |
| `private` / visibility on write (`followers_only`, `only_me`) | | `visibility` enum |
| `external_id` | "identifier provided at upload time", "should be a unique identifier" | `client_activity_id` UUID, `UNIQUE(athlete_id, client_activity_id)` |
| `kudos_count`, `comment_count`, `has_kudoed` | | computed / denormalized counts + per-viewer `has_kudoed` |
| `splits_metric`, `splits_standard` | Split objects | `splits` jsonb (metric; convert for display) |

- Upload processing checks for **duplicates** (the error says "duplicate of activity N"). Whether that keys on `external_id` or on data overlap is **unconfirmed** 🟡. Our design uses an explicit idempotency key.
- Manual activity creation requires `name`, `sport_type`, `start_date_local`, `elapsed_time`. Our create endpoint should require the equivalent.

---

## Things we could not verify (do not design around them as facts)

1. Numeric moving-time and auto-pause speed thresholds (and the "15 s" rest rule).
2. Auto-pause defaults for walks and hikes (only "on for rides" is documented; "turn it off for walks/hikes" is advice).
3. In-progress recording recovery after a crash or kill.
4. Exact paused-state button layout; whether Mute and Gear are on the initial save screen.
5. Heart-rate-based calories; behavior without a weight.
6. Self-kudos rule; owner deletion of others' comments; comment edit and length limits.
7. Where follow requests are approved in the app UI.
8. Default title naming ("Morning Run") from an official source.
9. Whether API duplicate detection uses `external_id`.
10. Under-18 privacy defaults (separate article not read).
11. Map-visibility details came from search snippets of the official article, not a full read.
