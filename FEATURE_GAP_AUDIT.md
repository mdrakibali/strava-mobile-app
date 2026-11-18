# COMPREHENSIVE PRODUCT RESEARCH & FEATURE-GAP AUDIT
**Strava (Free & Subscription) vs. Independent Open Fitness & Social Platform**
*Document Version: 1.0.0 | Date: November 2026 | Status: Final Pre-Implementation Audit*

---

## 1. Executive Summary & Audit Scope

This document provides a definitive product research, technical feasibility assessment, and feature-gap audit comparing the commercial fitness platform **Strava** (including both its Free tier and \$79.99/year Subscription tier) against our planned independent, open-source fitness tracking and social networking application.

### Key Audit Objectives
1. **Systematic Feature Comparison:** Audit all core fitness, advanced analytics, routing, safety, hardware integration, and social networking capabilities.
2. **Full Social Media Scope Expansion:** Formalize the strategic scope upgrade from UI-only mockups to a **fully functional, production-ready social media architecture** (activity feed, athlete social graph, clubs, challenges, events, real-time notifications, and backend-enforced privacy controls).
3. **Algorithmic Parity Without Subscriptions:** Reverse-engineer and provide open-source, scientifically validated algorithmic formulas for features paywalled by Strava (Grade Adjusted Pace, Relative Effort / TRIMP, Coggan Fitness & Freshness, Segments & Leaderboards, Best Efforts, and Matched Activities).
4. **Zero-Cost & Free-Tier Feasibility:** Establish direct, completely free and open-source implementation pathways that replace expensive proprietary APIs (Mapbox, Google Maps, Apple Weather, proprietary DEM elevation services) with zero-cost alternatives (MapLibre GL, OpenStreetMap, OSRM/Valhalla, Open-Meteo, Neon PostgreSQL + PostGIS, Cloudflare R2).
5. **Strict Boundary Definition:** Clarify which features are technically and legally viable, and explicitly mark features that remain out of scope (proprietary head-unit sync, paywalls, heavy 3D video flyovers).

---

## 2. Master Feature Comparison Matrix

| # | Feature Domain & Name | Strava Free | Strava Subscription ($79.99/yr) | Our Planned Application | Implementation Priority & Feasibility |
|---|---|:---:|:---:|:---:|---|
| **I. ACTIVITY RECORDING & HARDWARE** | | | | |
| 1 | Multi-Sport GPS Tracking (Run, Ride, Walk, Hike, etc.) | Yes | Yes | **Yes** (40+ sports supported) | **P0 - Core** (High precision GPS, dynamic sampling) |
| 2 | Background Tracking & Battery Optimization | Yes | Yes | **Yes** (Foreground service / persistent wake lock) | **P0 - Core** (Native mobile location hooks) |
| 3 | Auto-Pause & Moving Time Filtering | Yes | Yes | **Yes** (Speed threshold + dead reckoning) | **P0 - Core** (Configurable speed/distance threshold) |
| 4 | Manual Activity Entry & GPX/FIT File Upload | Yes | Yes | **Yes** (Full GPX, TCX, FIT file parsing) | **P0 - Core** (`@garmin/fitsdk`, fast XML parsing) |
| 5 | BLE Heart Rate Monitor Integration (0x180D) | No (Device app only) | No (Device app only) | **Yes** (Direct mobile BLE GATT pairing) | **P1 - Advanced** (Web Bluetooth / React Native BLE) |
| 6 | BLE Cycling Cadence & Speed (0x1816) | No | No | **Yes** (Direct mobile BLE GATT pairing) | **P1 - Advanced** (Standard GATT CSC profile) |
| 7 | BLE Cycling Power Meters (0x1818) | No | No | **Yes** (Direct mobile BLE GATT pairing) | **P2 - Advanced** (Standard GATT Power profile) |
| 8 | Indoor / Stationary Sensor Recording | Limited | Limited | **Yes** (BLE cadence/power without GPS) | **P2 - Advanced** (Sensor-only distance calculation) |
| 9 | Activity Audio Announcements (Splits, Pace, HR) | Basic | Basic | **Yes** (Text-to-Speech audio cues every km/mi) | **P1 - Polish** (Native TTS audio ducking) |
| **II. ROUTING, MAPPING & NAVIGATION** | | | | |
| 10 | Interactive Map Viewer (Pan, Zoom, Terrain) | Yes (OSM/Mapbox) | Yes (3D, Satellite) | **Yes** (MapLibre GL + Vector OpenStreetMap) | **P0 - Core** (Vector tiles via Carto/Stadia free tiers) |
| 11 | Manual Route Builder (Click to Draw Waypoints) | Yes (Web only) | Yes (Mobile + Web) | **Yes** (Mobile + Web Route Planner) | **P1 - Advanced** (OSRM / Valhalla foot/bike routing) |
| 12 | Elevation Profiles & Grade Analysis | Basic | Full Profile & Grade | **Yes** (DEM SRTM / Open-Elevation API) | **P1 - Advanced** (Interpolated 30m elevation DEM) |
| 13 | Turn-by-Turn Cue Sheet Generation | No | Yes | **Yes** (Step-by-step navigation maneuver cues) | **P1 - Advanced** (OSRM maneuver step extraction) |
| 14 | Offline Map Caching & Route Downloads | No | Yes | **Yes** (MBTiles / Vector tile caching locally) | **P2 - Future** (Corridor tile bounding box download) |
| 15 | GPX Route Export | Yes | Yes | **Yes** (Direct GPX download for bike computers) | **P0 - Core** (Standard GPX 1.1 XML generation) |
| 16 | Popularity / Heatmap Routing | No | Yes (Global Heatmap) | **Yes** (Internal route density aggregation) | **P2 - Advanced** (PostGIS route aggregation) |
| **III. SEGMENTS & LEADERBOARDS** | | | | |
| 17 | Segment Creation from Activity Polyline | Yes | Yes | **Yes** (Visual start/finish picker on activity) | **P1 - Advanced** (PostGIS ST_LineSubstring / ST_MakeLine) |
| 18 | Automated Segment Matching Engine | Yes | Yes | **Yes** (PostGIS bounding box + Hausdorff/DTW) | **P1 - Advanced** (Serverless background matcher) |
| 19 | Global Overall Leaderboard | Top 10 Only | Full Unfiltered | **Yes** (Full Unfiltered Leaderboards for all) | **P1 - Advanced** (SQL window functions, dense_rank) |
| 20 | Filtered Leaderboards (Gender, Age Group, Weight) | No | Yes | **Yes** (Fully customizable filter queries) | **P1 - Advanced** (Indexed multi-column filters) |
| 21 | Segment Best Efforts (KOM / QOM / PR Crowns) | Yes | Yes | **Yes** (Trophy badges, PR badges, crowns) | **P1 - Advanced** (Event-driven badge trigger) |
| 22 | Live Segments on Mobile Device | No | Yes | **Yes** (Proximity alert + real-time ghost delta) | **P2 - Advanced** (Local mobile geo-fence trigger) |
| **IV. TRAINING ANALYTICS & PHYSIOLOGICAL METRICS** | | | | |
| 23 | Grade Adjusted Pace (GAP) | No | Yes | **Yes** (Minetti + Downhill Braking Polynomial) | **P1 - Advanced** (Calculated on GPS elevation streams) |
| 24 | Relative Effort / Training Impulse (TRIMP) | No | Yes | **Yes** (Heart Rate Zone-Weighted Integration) | **P1 - Advanced** (Bannister/Morton TRIMP formulation) |
| 25 | Fitness, Fatigue & Freshness (CTL, ATL, TSB) | No | Yes | **Yes** (Coggan Impulse-Response Model) | **P1 - Advanced** (42-day CTL, 7-day ATL, TSB = CTL-ATL) |
| 26 | Best Efforts / Milestone PR Detection | 5k, 10k only | Full (400m to 50k) | **Yes** (Rolling window min-time pace detector) | **P1 - Advanced** (400m, 1k, 1mi, 5k, 10k, Half, Full) |
| 27 | Matched Activities (Route Evolution Over Time) | No | Yes | **Yes** (Spatial route clustering & history) | **P2 - Advanced** (Fréchet / 80% overlap clustering) |
| 28 | Heart Rate & Pace Zone Distribution | Basic | Detailed (5 Zones) | **Yes** (5-zone customizable HR & pace bands) | **P1 - Advanced** (Karvonen HR formula & custom bounds) |
| 29 | Cycling Power Curve & Critical Power (FTP) | No | Yes | **Yes** (Power duration curve: 5s, 1m, 5m, 20m, 60m)| **P2 - Advanced** (Monod & Scherrer critical power model) |
| 30 | Race Time Predictor (5k, 10k, Half, Marathon) | No | Yes | **Yes** (Riegel & Cameron physiological formula) | **P2 - Advanced** ($T_2 = T_1 \times (D_2 / D_1)^{1.06}$) |
| 31 | Automated Training Log & Volume Calendar | Basic | Advanced Multi-Sport | **Yes** (Interactive heat calendar & volume bars) | **P1 - Advanced** (Aggregated weekly/monthly summaries) |
| 32 | Custom Training Goals (Weekly/Annual/Segment) | Time/Dist Only | Advanced Metrics | **Yes** (Distance, time, elevation, consistency goals)| **P1 - Advanced** (Dynamic progress bars & notifications) |
| **V. FULL SOCIAL MEDIA ARCHITECTURE (EXPANDED SCOPE)** | | | | |
| 33 | Social Activity Feed (Home Timeline) | Yes | Yes | **Yes** (Chronological & Following-first feed) | **P0 - Core Social** (Cursor-based infinite scroll) |
| 34 | Activity Media & Captions (Photos & Rich Text) | Yes | Yes | **Yes** (Multi-photo upload + descriptions) | **P0 - Core Social** (Cloudflare R2 free tier storage) |
| 35 | Likes / Kudos System | Yes | Yes | **Yes** (Instant Kudos with optimistic UI updates) | **P0 - Core Social** (Duplicate-safe unique constraint) |
| 36 | Comments & Nested Discussion Threads | Yes | Yes | **Yes** (Parent-child nested comments & mentions) | **P0 - Core Social** (Tree/closure table or adjacency list) |
| 37 | Social Sharing (Web link, Story card, Image) | Yes | Yes | **Yes** (Dynamic OpenGraph share cards + image export)| **P1 - Polish** (Client-side HTML/Canvas render) |
| 38 | Athlete Social Graph (Follow, Unfollow, Block) | Yes | Yes | **Yes** (Bidirectional graph, request/approve) | **P0 - Core Social** (Mutual follow checks, privacy rules) |
| 39 | Athlete Search & Discovery | Yes | Yes | **Yes** (Full-text athlete search by name/city) | **P0 - Core Social** (PostgreSQL pg_trgm search) |
| 40 | Athlete Public Profiles & Gear / Shoe Tracker | Yes | Yes | **Yes** (Profile stats, trophy case, shoe mileage) | **P0 - Core Social** (Cumulative stats cache & gear table) |
| 41 | Clubs & Communities (Public & Private) | Yes | Yes | **Yes** (Club creation, roles: Admin, Member) | **P1 - Advanced Social** (Club feed, member rosters) |
| 42 | Club Leaderboards (Weekly Mileage & Elevation) | Yes | Yes | **Yes** (Rolling 7-day club leaderboards) | **P1 - Advanced Social** (Scheduled rollup / live query) |
| 43 | Distance & Time Challenges (Monthly & Custom) | Pre-made only | Group Challenges | **Yes** (System-wide + User-created challenges) | **P1 - Advanced Social** (Automated activity progress check) |
| 44 | Challenge Trophies & Virtual Badges | Yes | Yes | **Yes** (Permanent digital badges in trophy case) | **P1 - Advanced Social** (Awarded on challenge threshold) |
| 45 | Group Events & Meetups (Group Rides/Runs) | Yes (Clubs only) | Yes | **Yes** (Create events, route attachments, RSVPs) | **P1 - Advanced Social** (Event participant rosters & maps) |
| 46 | In-App Real-Time Notification Center | Yes | Yes | **Yes** (Kudos, comments, follows, club updates) | **P0 - Core Social** (Read/unread states, polling/SSE) |
| 47 | Direct & Group Messaging | Yes (Added 2024) | Yes | **Yes** (1-on-1 & Club chat messaging) | **P2 - Advanced Social** (WebSocket / SSE chat channels) |
| **VI. PRIVACY, SAFETY & DATA SOVEREIGNTY** | | | | |
| 48 | Privacy Zones (Mask Home/Office Start & End) | Yes | Yes | **Yes** (Circular radius masking + auto-trim) | **P0 - Core Privacy** (Backend-enforced spatial clip) |
| 49 | Activity Granular Visibility (Public, Followers, Private) | Yes | Yes | **Yes** (Strict backend authorization rules) | **P0 - Core Privacy** (Row-level security enforcement) |
| 50 | Sensitive Metrics Concealment (Hide HR, Pace, Power) | Yes | Yes | **Yes** (Per-activity toggles to redact fields) | **P1 - Advanced Privacy** (Nullification in API responses) |
| 51 | Beacon / Live Location Safety Sharing | Free (Mobile app)| Subscription (Garmin)| **Yes** (Unauthenticated secure tokenized URL) | **P1 - Advanced Safety** (Live GPS broadcast via WebSockets) |
| 52 | Personal Heatmap Generation | No | Yes | **Yes** (Rendered user heatmap overlay) | **P1 - Advanced Analytics** (Client-side WebGL / PostGIS) |
| 53 | Full Data Export & Portability (GDPR/Complete Archive) | Yes (Web export) | Yes | **Yes** (1-click raw GPX/JSON complete zip dump) | **P0 - Core Data** (User data ownership priority) |
| 54 | Weather Conditions Auto-Tagging | Yes | Yes | **Yes** (Historical weather at start coordinate) | **P1 - Polish** (Open-Meteo free API at start lat/lng) |

---

## 3. Core Fitness Features: In-Depth Technical Audit

### 3.1 Multi-Sport GPS Tracking & Recording Engine
* **Supported Disciplines:** Running, Trail Running, Treadmill/Virtual Run, Cycling (Road, Mountain, Gravel, Commute), Walking, Hiking, Wheelchair, Swimming (Open Water, Lap), Rowing, Kayaking, Skiing (Cross-Country, Alpine, Snowboarding), and Functional Strength Training.
* **GPS Signal Acquisition & Quality Gate:**
  * Must implement an adaptive Kalman filter or moving average window to reject horizontal dilution of precision (HDOP) spikes greater than 20 meters.
  * Discard stationary drift when GPS speed is less than $0.5 \text{ m/s}$ ($1.8 \text{ km/h}$) and positional jitter occurs within a 3-meter radius.
* **Auto-Pause & Moving Time Calculation:**
  * Strava distinguishes between **Elapsed Time** (total stopwatch duration from start to finish) and **Moving Time** (time spent moving above a speed threshold).
  * Implementation rule: Pause accumulation when velocity drops below $0.8 \text{ m/s}$ for $> 3$ consecutive seconds. Resume automatically when continuous velocity exceeds $1.0 \text{ m/s}$ for $> 2$ consecutive seconds.
  * Store both raw timestamp intervals (for exact pause reconstruction) and computed moving duration.

### 3.2 Background Tracking & Native Battery Management
* **Mobile Operating System Constraints:**
  * **Android:** Requires a foreground service running with an active persistent notification (`type="location"`), holding a partial wake lock, and registering with `FusedLocationProviderClient` with `PRIORITY_HIGH_ACCURACY` and 1-second update intervals.
  * **iOS:** Requires `UIBackgroundModes` configured with `location`, `pausesLocationUpdatesAutomatically = false`, and `showsBackgroundLocationIndicator = true`.
* **Power Optimization Protocol:**
  * Throttle screen redraws and map rendering when the application is backgrounded.
  * Buffer GPS location fixes in memory (batches of 10-30 points) and write to local SQLite / WatermelonDB storage asynchronously to avoid disk I/O thrashing.

### 3.3 Hardware & Sensor Integrations (BLE GATT)
Standardized Bluetooth Low Energy profiles allow universal connection to external sports hardware without proprietary SDKs:
1. **Heart Rate Service (UUID `0x180D`):**
   * Characteristic: `0x2A37` (Heart Rate Measurement). Reads instantaneous BPM and RR-intervals for Heart Rate Variability (HRV) analysis. Compatible with Polar H10, Garmin HRM-Pro, Wahoo TICKR, Scosche Rhythm+, and Apple Watch/WearOS broadcasts.
2. **Cycling Speed and Cadence Service (UUID `0x1816`):**
   * Characteristic: `0x2A5B` (CSC Measurement). Reads cumulative wheel revolutions and crank revolutions with timestamps to compute real-time RPM cadence and wheel-speed indoors without GPS.
3. **Cycling Power Service (UUID `0x1818`):**
   * Characteristic: `0x2A63` (Cycling Power Measurement). Reads instantaneous power in Watts, pedal balance (left/right percentage), and torque effectiveness.

---

## 4. Advanced Fitness Algorithmic Engine (Free & Open-Source Implementations)

Strava locks its most valuable analytical tools behind the \$79.99/year subscription. Below are the exact mathematical formulas, algorithms, and open-source models required to deliver full parity for free.

### 4.1 Grade Adjusted Pace (GAP)
* **The Problem:** Running uphill requires more metabolic effort per meter than running on flat terrain; running downhill requires less metabolic effort, but steep descents introduce mechanical braking and eccentric muscular fatigue.
* **Historical Model (Minetti 2002):**
  Alberto Minetti’s landmark study calculated the metabolic cost of running $C_r$ ($\text{J}\cdot\text{kg}^{-1}\cdot\text{m}^{-1}$) as a 5th-degree polynomial of gradient $g$ (where $g = \frac{\Delta \text{elevation}}{\Delta \text{distance}}$):
  $$C_r(g) = 155.4g^5 - 30.4g^4 - 43.3g^3 + 46.3g^2 + 19.5g + 3.6$$
  On flat ground ($g = 0$), $C_r(0) = 3.6 \text{ J}\cdot\text{kg}^{-1}\cdot\text{m}^{-1}$.
  The cost ratio is $k(g) = \frac{C_r(g)}{C_r(0)}$.
* **Strava-Parity Enhancement (Downhill Braking Correction):**
  Minetti’s laboratory model assumes runners continue gaining speed on steep descents (up to -30%). In reality, humans begin braking heavily beyond $-12\%$ grade due to quadriceps impact stress.
  To replicate Strava's real-world model:
  $$\text{Adjustment Factor } F(g) = \begin{cases} 
  1.0 + 3.5g + 6.0g^2 & \text{if } g \ge 0 \quad \text{(Uphill)} \\
  1.0 + 1.8g + 4.5g^2 & \text{if } -0.15 \le g < 0 \quad \text{(Moderate descent)} \\
  0.75 + 0.1(g + 0.15) & \text{if } g < -0.15 \quad \text{(Steep descent braking cap)}
  \end{cases}$$
  $$\text{Grade Adjusted Speed } V_{GAP} = V_{actual} \times F(g)$$
  $$\text{GAP } (\text{min/km}) = \frac{1000}{V_{GAP} \times 60}$$

### 4.2 Relative Effort & Cardiovascular Training Impulse (TRIMP)
* **Physiological Foundation:** Originally developed by Dr. Eric Banister (1975) and refined by Dr. Marco Altini for Strava's "Relative Effort":
  $$\text{TRIMP} = D \times \Delta HR_{ratio} \times 0.64 \cdot e^{y \cdot \Delta HR_{ratio}}$$
  Where:
  * $D$ = Duration of effort segment in minutes.
  * $\Delta HR_{ratio} = \frac{HR_{current} - HR_{rest}}{HR_{max} - HR_{rest}}$.
  * $y = 1.92$ (males) or $1.67$ (females), or a gender-neutral median $y = 1.80$.
* **Discretized Zone-Weighted Stream Integration:**
  For fast computation over second-by-second heart rate streams, categorize time into 5 zones based on Heart Rate Reserve (%HRR) or Max HR:
  * **Zone 1 (Active Recovery, 50-60% HRR):** Multiplier $w_1 = 1.0$
  * **Zone 2 (Aerobic Endurance, 60-70% HRR):** Multiplier $w_2 = 1.8$
  * **Zone 3 (Tempo, 70-80% HRR):** Multiplier $w_3 = 3.2$
  * **Zone 4 (Threshold, 80-90% HRR):** Multiplier $w_4 = 6.0$
  * **Zone 5 (Anaerobic / Vo2Max, 90-100% HRR):** Multiplier $w_5 = 12.0$
  $$\text{Relative Effort Score} = \sum_{z=1}^{5} \left( \frac{\text{Seconds in Zone } z}{60} \times w_z \right) \times \text{SportScalingFactor}$$
  *Sport Scaling Factor: Run = 1.0, Cycle = 0.85 (lower weight-bearing strain), Walk/Hike = 0.90, Swim = 1.10.*
* **RPE Fallback:** If no heart rate sensor is connected, allow the athlete to select a Borg Perceived Exertion Scale (1 to 10), multiplying duration by $(RPE / 4.5)^{1.8}$.

### 4.3 Coggan Fitness, Fatigue & Freshness (CTL, ATL, TSB)
* **Impulse-Response Equations (Dr. Andrew Coggan / Banister Model):**
  Tracks fitness progression and prevents overtraining across a rolling timeline using daily Training Stress Scores (TSS or Relative Effort):
  1. **Chronic Training Load (CTL - "Fitness"):** 42-day exponentially weighted moving average:
     $$CTL_{today} = CTL_{yesterday} + \left( TSS_{today} - CTL_{yesterday} \right) \times \left( 1 - e^{-1 / 42} \right)$$
     $$\lambda_{CTL} = 1 - e^{-1/42} \approx 0.0235$$
  2. **Acute Training Load (ATL - "Fatigue"):** 7-day exponentially weighted moving average:
     $$ATL_{today} = ATL_{yesterday} + \left( TSS_{today} - ATL_{yesterday} \right) \times \left( 1 - e^{-1 / 7} \right)$$
     $$\lambda_{ATL} = 1 - e^{-1/7} \approx 0.1331$$
  3. **Training Stress Balance (TSB - "Freshness" or "Form"):**
     $$TSB_{today} = CTL_{yesterday} - ATL_{yesterday}$$
* **Athletic Training Recommendations:**
  * **$TSB > +20$ (Trans-overtraining / Loss of fitness):** Athlete is resting too much; detraining risk.
  * **$+5 \le TSB \le +20$ (Raceday Ready / Peak Performance):** Optimal race readiness window.
  * **$-10 \le TSB < +5$ (Neutral Maintenance):** Efficient training stimulus.
  * **$-30 \le TSB < -10$ (Productive Overload):** Heavy building block; watch for recovery.
  * **$TSB < -30$ (High Injury & Overtraining Risk):** Immediate rest or active recovery recommended.

### 4.4 Automated Segment Matching Engine
* **Spatial Data Model:**
  Segments are stored as PostGIS `GEOMETRY(LineString, 4326)` with an associated elevation profile and sport type.
* **4-Step High-Performance Matching Pipeline:**
  1. **Spatial Bounding Box Candidate Filter (Spatial Index):**
     When an activity is uploaded, retrieve all segments whose 2D envelope intersects the activity's bounding box using PostGIS GiST index:
     ```sql
     SELECT s.id, s.name, s.distance_meters, s.polyline
     FROM segments s
     WHERE s.sport_type = :sportType
       AND s.geom && ST_Envelope(:activityGeom)
       AND ST_DWithin(s.geom::geography, :activityGeom::geography, 30.0);
     ```
  2. **Start and End Gate Crossing Verification:**
     * Segment start coordinate $P_{start}$ must be crossed within a 25-meter radius threshold at index $i_{entry}$.
     * Segment finish coordinate $P_{end}$ must be crossed within a 25-meter radius threshold at index $i_{exit}$, where $i_{exit} > i_{entry}$.
     * Interpolate fractional entry/exit timestamps between discrete GPS points for millisecond accuracy.
  3. **Path Geometry Similarity (Modified Hausdorff / Fréchet Distance):**
     Verify the sub-track between $i_{entry}$ and $i_{exit}$ did not cut corners:
     * Compute maximum orthogonal deviation between the athlete's sub-track and the benchmark segment geometry.
     * Reject match if $> 15\%$ of points deviate by more than 35 meters from the segment line.
  4. **Elapsed Time & Leaderboard Resolution:**
     $$T_{segment} = t_{exit} - t_{entry}$$
     Record effort in `segment_efforts`. Trigger leaderboard recalculation and assign PR / KOM / QOM rankings.

### 4.5 Best Efforts & Personal Records (PR) Detection
* **Target Milestone Distances:**
  * Running: 400m, 800m (1/2 mi), 1km, 1 mile, 2 miles, 5km, 10km, 15km, 10 miles, 20km, Half Marathon ($21,097.5\text{m}$), 30km, Marathon ($42,195\text{m}$), 50km.
  * Cycling: Peak power durations (5 seconds, 15 seconds, 30 seconds, 1 minute, 5 minutes, 10 minutes, 20 minutes, 60 minutes).
* **Sliding Window Minimum Elapsed Time Algorithm:**
  1. Construct a cumulative distance array $D[0 \dots n]$ and cumulative timestamp array $T[0 \dots n]$ from the activity stream.
  2. For a target milestone distance $D_{target}$:
     * Use two pointers $(L, R)$. Increment $R$ until $D[R] - D[L] \ge D_{target}$.
     * Calculate interpolated duration:
       $$\Delta t = (T[R] - T[L]) - \text{fractional overshoot correction}$$
     * Advance $L$ and update minimum $\Delta t_{min}$.
  3. Compare $\Delta t_{min}$ against the user's historical all-time and current-year best effort database table. If faster, award gold/silver/bronze PR medals and flag in the activity summary.

### 4.6 Matched Activities (Route History & Evolution)
* Group distinct activities that traverse the exact same route (e.g. daily morning commute or standard park loop).
* **Matching Criteria:** Minimum $80\%$ geometric overlap (measured via spatial buffer union: $\frac{\text{ST\_Area}(\text{ST\_Intersection}(\text{Buffer}(A, 50), \text{Buffer}(B, 50)))}{\text{ST\_Area}(\text{Buffer}(A, 50))} \ge 0.80$).
* Generate a time-series progression chart showing how the athlete’s pace and heart rate on this specific route have evolved over weeks, months, and years.

---

## 5. Full Social Media Architecture (Expanded Scope)

In compliance with the official scope decision, social features are upgraded from static UI mockups to a **fully realized, highly scalable social media platform**.

### 5.1 Social Activity Feed & Media
* **Chronological & Follower-First Timeline:**
  * Feeds prioritize activities from followed athletes, followed clubs, and personal workouts.
  * Cursor-based pagination using `(created_at, id)` composite keys ensures smooth 60fps infinite scrolling without duplicated or skipped items when new activities are posted in real-time.
* **Rich Activity Presentation:**
  * Post title, user caption, polyline map snapshot (privacy-clipped), key stats banner (distance, duration, pace/speed, elevation, calories, GAP, relative effort).
  * Multi-photo carousel with Cloudflare R2 image storage and thumbnail CDN caching.
* **Kudos / Likes System:**
  * Atomic toggle API (`POST /api/v1/activities/:id/kudos`).
  * Enforce database `UNIQUE(activity_id, user_id)` constraint to prevent duplicate likes.
  * Fast optimistic UI updates on the client; batch count caching on the activity record.
* **Comments & Nested Replies:**
  * Two-level tree structure (parent comment $\rightarrow$ replies) or adjacency list.
  * User mentions (`@username`) with automatic notification dispatch.
  * Profanity/spam filtering hooks and owner deletion rights.

### 5.2 Athlete Social Graph
* **Follow / Unfollow Dynamics:**
  * Support both Open Profiles (instant follow) and Protected Profiles (follow request $\rightarrow$ approval/rejection).
  * Tables: `follows` with status (`pending`, `accepted`), `follower_id`, `following_id`.
  * Real-time follower and following lists with mutual-follow indicators.
* **Athlete Search & Discovery:**
  * Full-text fuzzy search across display names, usernames, and home cities using PostgreSQL `pg_trgm` and GIN index.
  * "Athletes you may know" recommendation algorithm based on mutual club membership and geographic activity proximity.
* **Public Profiles & Trophies:**
  * Cumulative stats cards (Last 4 weeks, Year-to-Date, All-Time distance, time, elevation).
  * Trophy case showcasing KOM/QOM crowns, challenge badges, and milestone PR medals.
  * Shoe / Bicycle Gear Mileage Tracker (e.g., alert when running shoes hit 600km).

### 5.3 Clubs & Communities
* **Club Types:** Public clubs (open to all), Private clubs (invite/request only), and Sport-specific clubs (Running, Cycling, Triathlon).
* **Club Roles:** Owner, Admin, Member.
* **Club Activity Feed:** Dedicated feed aggregating activities performed by club members.
* **Club Leaderboards:** Rolling weekly leaderboards ranked by total distance, total elevation gain, or longest single activity.
* **Club Announcements & Discussions:** Text and image discussion board for group coordination.

### 5.4 Challenges & Group Events
* **Automated Challenges:**
  * Monthly Distance Challenges (e.g. "March 100km Running Challenge", "Gran Fondo 100km Cycling").
  * Elevation Challenges (e.g. "Climb 2,000m this month").
  * Consistency Challenges (e.g. "Log 3 activities per week for 4 weeks").
* **Automated Challenge Progress Evaluator:**
  * On every activity upload, an asynchronous background worker evaluates active user challenges.
  * Increment progress meter; when progress hits $100\%$, award the permanent digital badge to the athlete’s trophy case and trigger a congratulatory notification.
* **Group Events & Meetups:**
  * Create group runs/rides with date, time, meeting location, attached GPX route, and pace description.
  * RSVP system: "Going", "Maybe", "Can't Go" with attendee lists.

### 5.5 In-App Notification Center
* **Notification Event Triggers:**
  * Activity Kudos received.
  * Comment or reply on athlete's activity or thread.
  * Mention in a comment (`@athlete`).
  * New follow request or new follower.
  * Club invitation or membership approval.
  * Challenge milestone achieved or challenge completed.
  * Group event reminder 24 hours and 1 hour before start.
* **State Management:**
  * Unread count badge on mobile navigation bar.
  * Optimistic mark-as-read and bulk "Mark all as read" API.

---

## 6. Privacy, Safety & Backend-Enforced Security

### 6.1 Privacy Zones (Start/End Geographic Masking)
* **The Privacy Threat:** GPS tracks starting and ending at an athlete's home or workplace expose sensitive private addresses to the public.
* **Strava-Parity Masking Algorithm:**
  1. Athletes define one or multiple Privacy Zones by entering an address/coordinate and choosing a masking radius ($200\text{m}$ to $1,000\text{m}$).
  2. **Zero-Leakage Server-Side Clipping:**
     When an activity is processed, the backend clips all GPS coordinates that fall inside any of the user's active privacy zones before the polyline is saved to public caches or serialized via public APIs:
     ```typescript
     // Server-side point sanitization
     function maskActivityPoints(points: LatLng[], privacyZones: PrivacyZone[]): LatLng[] {
       return points.map(pt => {
         const isInZone = privacyZones.some(zone => 
           haversineDistance(pt, zone.center) <= zone.radiusMeters
         );
         return isInZone ? null : pt; // Redact or clip
       }).filter(Boolean);
     }
     ```
  3. The activity owner sees their complete track in private; followers or public viewers only receive the masked polyline with start/finish truncated outside the zone.
  4. Any segment starting or ending inside an athlete's privacy zone is automatically excluded from public segment leaderboards.

### 6.2 Granular Visibility & Access Control
* **Activity-Level Privacy:**
  * `EVERYONE` (Public): Visible in global feeds, club feeds, search, and segment leaderboards.
  * `FOLLOWERS_ONLY`: Visible only to approved followers; excluded from public leaderboards.
  * `ONLY_ME` (Private): Completely hidden from all feeds and leaderboards; visible only to the athlete.
* **Sensitive Metric Redaction:**
  * Individual toggles per activity: `hide_heart_rate`, `hide_pace`, `hide_power`, `hide_start_time`, `hide_map`.
  * Redacted fields are stripped out at the database query layer (`SELECT ... EXCLUDE`) so values are never sent over the network.
* **User Safety Controls:**
  * Two-way blocking: Blocked users cannot see profiles, feeds, or activities, and cannot search for or message each other.
  * In-app reporting mechanism for abusive comments, spam, or suspicious activity tracks.

### 6.3 Beacon: Free Real-Time Live Location Sharing
* **Strava Subscription Limitation:** Strava charges for Beacon on standalone devices and gates advanced features.
* **Our Free-Tier Implementation:**
  1. The athlete starts an activity and toggles "Live Beacon".
  2. The mobile client generates a cryptographically secure, unguessable public spectator token (UUIDv4) linked to the active session.
  3. The athlete shares the link (e.g. `https://our-domain.com/beacon/e7b23f81-54bc...`) via SMS, WhatsApp, or email to emergency contacts.
  4. While recording, the mobile client sends lightweight telemetry updates every 15-30 seconds over WebSockets or HTTP POST:
     `{ lat, lng, altitude, current_speed, heart_rate, battery_pct, elapsed_seconds, last_updated_at }`.
  5. The spectator web viewer displays an interactive MapLibre map showing the athlete's real-time position, breadcrumb path, current pace, and battery level—no app install or account required.
  6. The session automatically terminates upon activity completion or after 24 hours.

---

## 7. Free & Open-Source Infrastructure vs. Paid / Proprietary Stacks

| Strava Commercial Stack / Dependency | Estimated Enterprise Cost | Free & Open-Source Replacement | Open Alternative Feasibility & Integration Notes |
|---|---|---|---|
| **Mapbox GL & Mapbox Directions API** | \$5.00 / 1,000 requests | **MapLibre GL + OpenStreetMap (OSM) + Carto / Stadia Free Tiers** | Fully vector-compatible, zero license fees, smooth offline MBTiles caching. |
| **Google Maps Geocoding & Elevation API** | \$5.00 - \$10.00 / 1,000 requests | **Nominatim (Geocoding) + Open-Elevation / USGS SRTM 30m DEM** | Completely free open-source digital elevation model with 30-meter global grid. |
| **Proprietary Route Engine & Heatmaps** | In-house multi-million \$ infra | **OSRM (Open Source Routing Machine) / Valhalla / GraphHopper** | Turn-by-turn routing algorithms with surface weighting for foot and bike paths. |
| **Apple Weather / WeatherKit API** | Commercial developer tiers | **Open-Meteo API** | Free for non-commercial and open usage; no API key required; historical weather by coordinate. |
| **AWS S3 Media Storage & CloudFront** | High bandwidth egress fees | **Cloudflare R2 Free Tier + Cloudflare CDN** | 10 GB free monthly storage, **zero egress bandwidth fees**, S3-compatible API. |
| **Proprietary Athlete Intelligence (LLM)** | High LLM API token costs | **Local Rule-Based Performance Engine + Optional Free Gemini API** | Deterministic biomechanical summaries computed instantly on-device or backend. |
| **AWS RDS Aurora Enterprise Database** | \$100+ / month | **Neon PostgreSQL (Free Serverless Tier) + PostGIS** | Full spatial indexing (`ST_DWithin`, `ST_Envelope`, GiST) with generous free tier. |
| **Pusher / Firebase Realtime Notifications** | Paid monthly tiers | **Self-Hosted SSE (Server-Sent Events) / WebSockets** | Native Hono/Node.js WebSocket streaming without third-party message brokers. |

---

## 8. Features Explicitly Kept Out of Scope (and Why)

To maintain technical feasibility, strict legal compliance, and zero operating costs, the following features are intentionally excluded:

1. **Subscriptions, Paywalls & Premium Tiers:**
   * *Rationale:* Violates our core product requirement: all features must be open, inclusive, and accessible to every athlete.
2. **Proprietary Bike Computer Live Segments (Garmin Connect IQ / Wahoo ELEMNT):**
   * *Rationale:* Garmin and Wahoo require proprietary, closed commercial B2B developer partnerships and NDA licenses to push real-time segments directly to their proprietary firmware. Our app supports standard GPX/FIT export and live segments on our own mobile app.
3. **Automated 3D Video Flyover Rendering (e.g. Relive / FATMAP 3D):**
   * *Rationale:* Generating 3D topographic video renders consumes massive GPU cloud rendering hours and proprietary satellite imagery, exceeding free-tier infrastructure. Interactive 2D/2.5D elevation profile maps provide equal analytical utility.
4. **Standalone Cellular Apple Watch / WearOS App (Phone-Free LTE Live Streaming):**
   * *Rationale:* Building and maintaining independent watchOS and WearOS apps with independent cellular radio streams requires multi-platform watch teams and specialized hardware certification. Standard phone-linked BLE recording and Apple Health / Health Connect data syncing deliver full data portability without watch-native maintenance overhead.

---

## 9. Technical Architecture, Database Schemas & API Specifications

### 9.1 Database Architecture (Neon PostgreSQL + PostGIS)

Below is the production-ready schema design fulfilling both the Core Fitness and Full Social requirements.

```sql
-- Enable PostGIS and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. USERS & ATHLETE PROFILES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    profile_visibility VARCHAR(20) DEFAULT 'PUBLIC' CHECK (profile_visibility IN ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE')),
    max_heart_rate INT DEFAULT 190,
    resting_heart_rate INT DEFAULT 60,
    ftp_watts INT DEFAULT 200,
    weight_kg NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);

-- 2. PRIVACY ZONES
CREATE TABLE privacy_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    center GEOMETRY(Point, 4326) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 500 CHECK (radius_meters BETWEEN 100 AND 2000),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_privacy_zones_center ON privacy_zones USING gist (center);

-- 3. ACTIVITIES (FITNESS + SOCIAL CORE)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    sport_type VARCHAR(50) NOT NULL,
    visibility VARCHAR(20) DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'FOLLOWERS_ONLY', 'ONLY_ME')),
    
    -- Timings & Durations
    start_time TIMESTAMPTZ NOT NULL,
    elapsed_time_seconds INT NOT NULL,
    moving_time_seconds INT NOT NULL,
    
    -- Fitness Metrics
    distance_meters NUMERIC(10,2) NOT NULL,
    elevation_gain_meters NUMERIC(8,2) DEFAULT 0,
    elevation_loss_meters NUMERIC(8,2) DEFAULT 0,
    average_speed_mps NUMERIC(6,3) NOT NULL,
    max_speed_mps NUMERIC(6,3),
    average_cadence INT,
    average_heart_rate INT,
    max_heart_rate INT,
    average_power_watts INT,
    max_power_watts INT,
    calories INT,
    
    -- Advanced Analytics
    grade_adjusted_pace_seconds INT,
    relative_effort_score INT,
    training_stress_score NUMERIC(6,2),
    
    -- Spatial Data
    raw_polyline TEXT, -- Original track for owner
    masked_polyline TEXT, -- Privacy-clipped track for followers/public
    summary_polyline TEXT, -- Simplified overview polyline
    start_point GEOMETRY(Point, 4326),
    end_point GEOMETRY(Point, 4326),
    bounding_box GEOMETRY(Polygon, 4326),
    
    -- Privacy Toggles
    hide_heart_rate BOOLEAN DEFAULT FALSE,
    hide_pace BOOLEAN DEFAULT FALSE,
    hide_power BOOLEAN DEFAULT FALSE,
    hide_start_time BOOLEAN DEFAULT FALSE,
    hide_map BOOLEAN DEFAULT FALSE,
    
    -- Social Counters Cache
    kudos_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at_id ON activities(created_at DESC, id DESC);
CREATE INDEX idx_activities_start_time ON activities(start_time DESC);
CREATE INDEX idx_activities_bbox ON activities USING gist (bounding_box);

-- 4. ACTIVITY PHOTOS
CREATE TABLE activity_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SOCIAL GRAPH (FOLLOWS)
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACCEPTED' CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX idx_follows_following_status ON follows(following_id, status);

-- 6. KUDOS / LIKES
CREATE TABLE kudos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);
CREATE INDEX idx_kudos_activity ON kudos(activity_id);

-- 7. COMMENTS & REPLIES
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_comments_activity ON comments(activity_id, created_at ASC);

-- 8. CLUBS & MEMBERSHIPS
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    sport_type VARCHAR(50) DEFAULT 'ALL',
    is_private BOOLEAN DEFAULT FALSE,
    banner_url TEXT,
    avatar_url TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    member_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE club_members (
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (club_id, user_id)
);

-- 9. CHALLENGES & PARTICIPATION
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    sport_type VARCHAR(50) NOT NULL,
    challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN ('DISTANCE', 'ELEVATION', 'TIME', 'FREQUENCY')),
    target_value NUMERIC(10,2) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    badge_icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_participants (
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_progress NUMERIC(10,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

-- 10. SEGMENTS & EFFORTS
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    sport_type VARCHAR(50) NOT NULL,
    distance_meters NUMERIC(10,2) NOT NULL,
    elevation_difference_meters NUMERIC(8,2),
    average_grade_percent NUMERIC(5,2),
    max_grade_percent NUMERIC(5,2),
    polyline TEXT NOT NULL,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    start_point GEOMETRY(Point, 4326) NOT NULL,
    end_point GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_segments_geom ON segments USING gist (geom);
CREATE INDEX idx_segments_start ON segments USING gist (start_point);

CREATE TABLE segment_efforts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    elapsed_time_seconds INT NOT NULL,
    moving_time_seconds INT NOT NULL,
    average_heart_rate INT,
    average_power_watts INT,
    start_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_segment_efforts_leaderboard ON segment_efforts(segment_id, elapsed_time_seconds ASC);
CREATE INDEX idx_segment_efforts_user ON segment_efforts(user_id, segment_id);

-- 11. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'KUDOS', 'COMMENT', 'FOLLOW', 'CHALLENGE_WON'
    target_id UUID, -- activity_id, club_id, or challenge_id
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

## 10. Phased Implementation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Core Foundation & Auth
        P1A[User Auth & Profile Setup] --> P1B[Privacy Zones & Settings]
    end

    subgraph Phase 2: Fitness Engine & Tracking
        P2A[Mobile GPS Engine & BLE Pairing] --> P2B[Moving Time & Auto-Pause]
        P2B --> P2C[GPX & FIT Importer / Exporter]
    end

    subgraph Phase 3: Algorithmic Parity Engine
        P3A[Minetti Grade Adjusted Pace] --> P3B[Bannister Relative Effort / TRIMP]
        P3B --> P3C[Coggan Fitness & Freshness CTL/ATL/TSB]
        P3C --> P3D[Best Efforts & Milestone PR Detector]
    end

    subgraph Phase 4: Full Social Media Architecture
        P4A[Social Activity Feed & Media] --> P4B[Atomic Kudos & Nested Comments]
        P4B --> P4C[Athlete Follow Graph & Search]
        P4C --> P4D[Notification Center Dispatcher]
    end

    subgraph Phase 5: Clubs, Challenges & Events
        P5A[Club Rosters & Feeds] --> P5B[Automated Distance/Time Challenges]
        P5B --> P5C[Group Meetups & Events]
    end

    subgraph Phase 6: Spatial Segments & Beacon Safety
        P6A[PostGIS Segment Matcher] --> P6B[Global & Filtered Leaderboards]
        P6B --> P6C[Beacon Real-Time Live Spectator URL]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
    Phase 4 --> Phase 5
    Phase 5 --> Phase 6
```

### Prioritization Summary
* **Phase 1: Foundation, Auth & Privacy Infrastructure (P0)**
  * Neon PostgreSQL database migrations, JWT authentication, user profile management.
  * Privacy Zone definition with backend-enforced spatial polygon clipping.
* **Phase 2: Mobile GPS Tracking, Background Engine & File Portability (P0)**
  * Background foreground service, adaptive Kalman filtering, auto-pause/moving-time detector.
  * Direct BLE GATT integrations (0x180D Heart Rate, 0x1816 Cadence/Speed).
  * Robust FIT (`@garmin/fitsdk`) and GPX file parsers and exporters.
* **Phase 3: Fitness Analytics & Algorithmic Parity (P1)**
  * Grade Adjusted Pace (GAP) calculation with downhill braking threshold.
  * Relative Effort (TRIMP) zone-weighted integration.
  * Coggan impulse response engine (CTL, ATL, TSB rolling curves).
  * Rolling window Best Efforts milestone detector (400m through Marathon).
* **Phase 4: Full Social System & Athlete Graph (P0 Social Scope)**
  * Activity feed with cursor pagination (`(created_at, id)`).
  * Multi-photo upload to Cloudflare R2 and optimistic Kudos and Comment threads.
  * Athlete search (`pg_trgm`), follow/unfollow dynamics, public athlete profiles.
  * Event-driven in-app notification center.
* **Phase 5: Clubs, Group Events & Community Challenges (P1 Social Scope)**
  * Club management, club member rosters, club-specific activity feeds, and weekly mileage leaderboards.
  * Automated monthly distance/elevation challenges with virtual trophy case awards.
  * Group event creation, route attachments, and attendee RSVP management.
* **Phase 6: Spatial Segments, Leaderboards & Beacon Live Safety (P1/P2)**
  * PostGIS spatial indexing for automated segment matching.
  * Full unfiltered leaderboards with age, gender, and date filtering.
  * Beacon live tracking engine with unauthenticated spectator URLs and WebSockets.
  * Route builder with OpenStreetMap tiles and OSRM turn-by-turn cue sheets.

---

## 11. Conclusion & Implementation Go-Ahead

This feature-gap audit confirms that:
1. Every major Strava capability—both free and subscription-tier—can be achieved independently using open-source algorithms, standard Bluetooth profiles, and free-tier-compatible infrastructure.
2. The upgraded social media scope (Feed, Kudos, Comments, Follows, Clubs, Challenges, Events, Notifications) provides the critical viral community loop that makes Strava compelling, while backend-enforced privacy zones eliminate user safety vulnerabilities.
3. No paid third-party APIs or subscription paywalls are required.

We are ready to proceed with architecture documentation updates and execution according to this specification.

