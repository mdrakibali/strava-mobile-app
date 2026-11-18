# PROJECT STATUS & ARCHITECTURE REVIEW
**Open Strava-Parity Fitness Tracking & Social Platform**
*Last Updated: November 2026 | Status: Planning & Architecture Phase Approved*

---

## 1. Project Health & Summary Dashboard

| Metric | Status | Notes |
|---|:---:|---|
| **Current Phase** | **Mobile Frontend Complete (49 Screens & Routes)** | All UI/UX flows, analytics, GPS cockpit, and social screens built with Tailwind v4 |
| **Fitness Tracking Scope** | **Complete Parity** | 40+ sports, background GPS, BLE sensors, GAP, TRIMP, Coggan CTL/ATL/TSB |
| **Social Media Scope** | **Upgraded to Full Social** | Real database-backed Feed, Kudos, Nested Comments, Follows, Clubs, Challenges, Events |
| **Privacy & Safety** | **Backend-Enforced** | Server-side Privacy Zones, coordinate sanitization, granular activity visibility |
| **Infrastructure Cost** | **$0.00 / Free Tier** | Neon PostgreSQL (PostGIS), MapLibre GL, OSM, OSRM, Cloudflare R2, Open-Meteo |
| **Architecture Quality** | **Strict TypeScript** | Expo (React Native) + Hono (@hono/node-server) + Drizzle ORM |

---

## 2. Scope Change Review: Full Social Media Features

In response to leadership guidance, social features have transitioned from UI-only mockups to a **fully functioning, scalable social media ecosystem**.

### 2.1 Scope Diff: Previous vs. Updated Scope

| Domain | Previous Scope (UI-Only) | Updated Scope (Production Full Social) |
|---|---|---|
| **Activity Feed** | Static mock feed cards with hardcoded activities | Dynamic chronological feed from followed athletes, cursor pagination, image carousels |
| **Kudos / Likes** | Local component state toggle; resets on reload | Atomic database toggle (`kudos` table), deduplication, optimistic UI, author notifications |
| **Comments** | Read-only mock comment list | Full CRUD comments, parent-child nested replies, `@mention` parsing, instant notifications |
| **Athlete Network** | Static profile screens | Follow/unfollow state machine, mutual follow tracking, athlete search (`pg_trgm`), block/report |
| **Clubs & Groups** | Mock club cards | Club creation, role-based membership (Owner/Admin/Member), club activity feed, weekly mileage leaderboards |
| **Challenges & Events**| Visual-only badges | Dynamic challenges, automatic progress evaluation on upload, badge awards, group events with RSVP |
| **Notifications** | Static bell icon | Real-time notification center (Kudos, Comments, Follows, Badges), read/unread state tracking |
| **Privacy & Security** | Client-side visual crop | Strict backend coordinate clipping; zero coordinate leakage; row-level activity authorization |

---

## 3. Architectural Decision Records (ADRs)

### ADR 001: Mobile Application Framework
* **Decision:** Build the mobile client with **React Native / Expo** with strict TypeScript.
* **Context:** Need cross-platform (iOS and Android) support, high-frequency background GPS tracking, native Bluetooth Low Energy (BLE) peripheral communication, and interactive vector map rendering.
* **Consequences:** Provides access to `expo-location` / background location tasks, `react-native-ble-plx` for GATT sensor communication, and `@maplibre/maplibre-react-native` for high-performance vector tiles.

### ADR 002: Backend Engine (Hono) & Spatial Database
* **Decision:** Implement the backend in `strava/mobile-backend` using **Hono + @hono/node-server + TypeScript**, connected to **Neon PostgreSQL** with the **PostGIS** extension and **Drizzle ORM**.
* **Context:** Fitness platforms are inherently spatial. Calculating bounding boxes, segment line crossings, privacy buffers, and distance geometries require robust, indexed geospatial operations. Hono provides an ultra-lightweight, high-performance web standards-based API framework.
* **Consequences:** Hono delivers industry-leading throughput, low memory footprint, and edge/node versatility. PostGIS provides standard spatial operators (`ST_DWithin`, `ST_Envelope`, `ST_Intersection`, `ST_LineSubstring`, `ST_FrechetDistance`), accessed cleanly via Drizzle ORM.

### ADR 003: Open-Source Mapping, Elevation & Routing
* **Decision:** Replace proprietary Google Maps and Mapbox APIs with **MapLibre GL**, **OpenStreetMap**, and **OSRM / Valhalla**.
* **Context:** Google Maps and Mapbox introduce substantial per-request billing that prevents free, independent operation.
* **Consequences:** Vector map tiles via Carto/Stadia free tiers or self-hosted PMTiles; turn-by-turn routing through OSRM public APIs or containerized instances; digital elevation model (DEM) via Open-Elevation and SRTM 30m.

### ADR 004: Reverse-Engineered Algorithmic Parity
* **Decision:** Implement **Minetti GAP** (with steep downhill braking caps), **Banister/Altini TRIMP** (zone-weighted Relative Effort), and **Coggan Impulse-Response** (42-day CTL, 7-day ATL, TSB Form) directly in TypeScript.
* **Context:** These metrics are Strava subscription paywalled ($79.99/yr) but rest upon published physiological science.
* **Consequences:** Delivers elite analytical parity to all users without external subscription fees.

### ADR 005: Server-Side Privacy Zone Coordinate Clipping
* **Decision:** All privacy-zone masking must be computed **server-side** during activity ingest.
* **Context:** Client-side masking allows malicious actors to inspect HTTP responses and extract unmasked GPS coordinates of an athlete's home or workplace.
* **Consequences:** The backend generates two polyline streams: a private `raw_polyline` accessible only by the activity owner, and a `masked_polyline` where coordinates inside any active privacy zone are removed before serving to followers or the public.

### ADR 006: High-Performance Feed Pagination
* **Decision:** Use **cursor-based pagination** using composite keys `(created_at, id)` across all feeds and leaderboards instead of SQL `OFFSET / LIMIT`.
* **Context:** In an active social fitness feed, `OFFSET` results in duplicate items and missing items when new workouts are posted while the user is scrolling, as well as degraded performance at high offsets ($O(N)$ table scans).
* **Consequences:** $O(1)$ index seek performance (`WHERE (created_at, id) < (:cursorCreatedAt, :cursorId) ORDER BY created_at DESC, id DESC LIMIT 20`).

---

## 4. API Endpoints Blueprint

### 4.1 Authentication & Athlete Profiles
* `POST /api/v1/auth/register` - Create athlete account with initial metric settings.
* `POST /api/v1/auth/login` - Authenticate athlete, issue JWT access + refresh tokens.
* `GET /api/v1/athletes/me` - Retrieve authenticated athlete profile and privacy settings.
* `PUT /api/v1/athletes/me` - Update profile, bio, weight, max HR, resting HR, and FTP.
* `GET /api/v1/athletes/:id` - View athlete public profile, cumulative stats, and trophy case.
* `GET /api/v1/athletes/search?q=:query` - Full-text athlete search (`pg_trgm`).

### 4.2 Privacy Zones
* `POST /api/v1/privacy-zones` - Create privacy zone (center coordinate, radius 100m-2000m).
* `GET /api/v1/privacy-zones` - List athlete's defined privacy zones.
* `DELETE /api/v1/privacy-zones/:id` - Delete a privacy zone.

### 4.3 Activity Recording & Processing
* `POST /api/v1/activities` - Upload completed activity JSON payload (GPS track, sensor streams).
* `POST /api/v1/activities/upload-file` - Upload raw GPX / FIT / TCX binary file.
* `GET /api/v1/activities/:id` - Fetch detailed activity analysis (splits, HR zones, elevation, GAP).
* `PUT /api/v1/activities/:id` - Update activity title, description, sport type, and visibility.
* `DELETE /api/v1/activities/:id` - Delete activity.
* `GET /api/v1/activities/:id/export?format=gpx|fit` - Export activity data.

### 4.4 Social Media: Feed, Kudos & Comments
* `GET /api/v1/feed` - Cursor-paginated social activity feed from followed athletes and clubs.
* `POST /api/v1/activities/:id/kudos` - Toggle Kudos (like) on an activity.
* `GET /api/v1/activities/:id/kudos` - List athletes who gave Kudos.
* `POST /api/v1/activities/:id/comments` - Post comment or reply.
* `GET /api/v1/activities/:id/comments` - List threaded comments for an activity.
* `DELETE /api/v1/comments/:id` - Delete user's own comment.
* `POST /api/v1/activities/:id/photos` - Upload photo to Cloudflare R2 bucket.

### 4.5 Athlete Social Graph
* `POST /api/v1/athletes/:id/follow` - Follow or request to follow athlete.
* `DELETE /api/v1/athletes/:id/follow` - Unfollow athlete.
* `GET /api/v1/athletes/:id/followers` - List athlete's followers.
* `GET /api/v1/athletes/:id/following` - List athletes followed by this user.
* `POST /api/v1/athletes/:id/block` - Block user.

### 4.6 Clubs & Groups
* `POST /api/v1/clubs` - Create new club (name, sport type, description, privacy).
* `GET /api/v1/clubs` - List and discover clubs.
* `GET /api/v1/clubs/:id` - Club details, roster, and announcements.
* `POST /api/v1/clubs/:id/join` - Join or request to join club.
* `POST /api/v1/clubs/:id/leave` - Leave club.
* `GET /api/v1/clubs/:id/feed` - Club activity feed.
* `GET /api/v1/clubs/:id/leaderboard` - Rolling 7-day club leaderboard.

### 4.7 Challenges & Events
* `GET /api/v1/challenges` - List available active monthly/weekly challenges.
* `POST /api/v1/challenges/:id/join` - Join a challenge.
* `GET /api/v1/challenges/:id` - View challenge progress, rules, and participant leaderboard.
* `POST /api/v1/events` - Create group workout/meetup.
* `GET /api/v1/events` - Discover upcoming group events.
* `POST /api/v1/events/:id/rsvp` - RSVP to an event (Going / Maybe / Decline).

### 4.8 Segments & Leaderboards
* `POST /api/v1/segments` - Create segment from an activity polyline.
* `GET /api/v1/segments/explore` - Explore segments within map bounding box.
* `GET /api/v1/segments/:id` - View segment geometry, elevation profile, and stats.
* `GET /api/v1/segments/:id/leaderboard` - Full unfiltered leaderboard with gender/age filters.

### 4.9 Beacon Live Tracking
* `POST /api/v1/beacon/start` - Initiate active live session; returns public spectator token.
* `POST /api/v1/beacon/ping` - Push real-time telemetry (lat, lng, speed, HR, battery).
* `GET /api/v1/beacon/:token` - Public spectator endpoint returning live location and path trail.
* `POST /api/v1/beacon/stop` - Terminate live session.

### 4.10 Notifications
* `GET /api/v1/notifications` - Fetch paginated notification stream.
* `PUT /api/v1/notifications/:id/read` - Mark single notification as read.
* `PUT /api/v1/notifications/read-all` - Mark all notifications as read.

---

## 5. Master Implementation Checklist

### Phase 1: Foundation, Auth & Privacy Infrastructure
- [x] Scaffold `mobile-frontend` using official Expo CLI (`create-expo-app` with Tabs & TypeScript).
- [x] Scaffold `mobile-backend` using official Hono CLI (`create-hono` with Node.js runtime).
- [ ] Configure Neon PostgreSQL with PostGIS and UUID extensions.
- [ ] Setup Drizzle ORM schema matching Section 9.1 of the Audit.
- [ ] Implement JWT Authentication with access and refresh tokens in Hono.
- [ ] Implement Athlete profile management & heart rate/FTP physiological parameters.
- [ ] Implement Privacy Zone creation, persistence, and server-side spatial clipping utility.

### Phase 2: Activity Recording, GPS Engine & Sensors
- [ ] Implement Mobile GPS service with adaptive Kalman noise filtering.
- [ ] Implement Android Foreground Service & iOS Background Location tasks.
- [ ] Implement Auto-Pause and moving time vs elapsed time calculator.
- [ ] Implement Bluetooth Low Energy (BLE) GATT manager (Heart Rate 0x180D, Speed/Cadence 0x1816).
- [ ] Implement `@garmin/fitsdk` binary parser and GPX XML parser.
- [ ] Implement GPX / FIT export generator.

### Phase 3: Advanced Fitness Algorithmic Engine
- [ ] Implement Minetti (2002) + Downhill Braking Grade Adjusted Pace (GAP) calculator.
- [ ] Implement Bannister / Altini zone-weighted Relative Effort / TRIMP engine.
- [ ] Implement Coggan Impulse-Response model (42-day CTL, 7-day ATL, TSB Form).
- [ ] Implement rolling-window Best Efforts / Milestone PR detector (400m to Marathon).
- [ ] Implement 5-zone Heart Rate and Power distribution analytics.
- [ ] Implement automated Open-Meteo weather integration for activity start locations.

### Phase 4: Full Social Media Architecture
- [ ] Implement Cursor-based Social Activity Feed API with `(created_at, id)` indexes.
- [ ] Implement Cloudflare R2 multi-photo upload and responsive image carousels.
- [ ] Implement Atomic Kudos (Like) toggle API with optimistic mobile UI updates.
- [ ] Implement Threaded Comments & Nested Replies with `@mention` parser.
- [ ] Implement Athlete Social Graph: Follow, Unfollow, Follow Requests, and Block/Report.
- [ ] Implement Full-Text Athlete Search (`pg_trgm` GIN index).
- [ ] Implement Event-Driven Notification Dispatcher and Mobile Notification Center.

### Phase 5: Clubs, Challenges & Group Events
- [ ] Implement Club creation, role management (Owner/Admin/Member), and club directories.
- [ ] Implement Club Activity Feed and rolling 7-day mileage/elevation leaderboards.
- [ ] Implement Automated Distance and Elevation Challenges engine.
- [ ] Implement Background Worker for automatic Challenge progress evaluation and badge awards.
- [ ] Implement Group Events / Meetups creation, GPX route attachment, and RSVP tracker.

### Phase 6: Segments, Route Planning & Beacon Safety
- [ ] Implement Segment creation tool from activity polyline.
- [ ] Implement PostGIS Spatial Indexing and Segment Matching Engine (bounding box + gates + DTW).
- [ ] Implement Full Unfiltered Leaderboards with gender, age group, and date filters.
- [ ] Implement Route Planner using MapLibre GL and OSRM turn-by-turn routing engine.
- [ ] Implement Beacon Real-Time Live Location sharing with unauthenticated spectator URL.
- [ ] Implement Personal Heatmap WebGL / PostGIS aggregation layer.

### Phase 7: Verification, Performance & Final Polish
- [ ] Run comprehensive unit and integration test suites across analytics and social engines.
- [ ] Verify zero GPS coordinate leakage across all public endpoints and privacy zones.
- [ ] Optimize database query plans (`EXPLAIN ANALYZE`) for feeds and leaderboards.
- [ ] Test BLE reconnection resilience and offline activity queue syncing.

