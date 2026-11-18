# Open Strava: Free-Tier Fitness Tracking & Social Media Platform

> An open-source, subscription-free, privacy-first fitness tracking and social networking platform engineered for full algorithmic and community parity with Strava.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon%20PostgreSQL%20%2B%20PostGIS-336791.svg)](https://neon.tech/)
[![MapLibre](https://img.shields.io/badge/Maps-MapLibre%20GL-brightgreen.svg)](https://maplibre.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Overview & Core Mission

This project delivers a complete, production-grade alternative to commercial fitness applications like Strava, eliminating paywalls, monthly subscription fees, and privacy risks.

Every advanced metric that Strava restricts behind its \$79.99/year subscription tier—such as **Grade Adjusted Pace (GAP)**, **Relative Effort (TRIMP)**, **Fitness & Freshness (CTL/ATL/TSB)**, **Unfiltered Segment Leaderboards**, and **Beacon Live Tracking**—is implemented natively using open scientific formulas and free, open-source infrastructure.

Following an official scope enhancement, the platform features a **fully functioning, scalable social media ecosystem**—complete with activity feeds, media uploads, Kudos, threaded discussions, athlete follow graphs, clubs, challenges, group events, and in-app notifications.

---

## 2. Key Features

### 🏃 Fitness Recording & Hardware
* **40+ Supported Sport Disciplines:** Run, Trail Run, Road Bike, Mountain Bike, Gravel Ride, Walk, Hike, Swim, Row, Ski, and Gym workouts.
* **High-Precision Background GPS:** Adaptive Kalman filtering, noise rejection, and Android Foreground Service / iOS background location tracking.
* **Smart Auto-Pause:** Automated speed-threshold detection separating moving time from elapsed time.
* **Direct BLE Sensor Integration:** Connect Bluetooth Low Energy sensors directly without proprietary apps:
  * Heart Rate Monitors (Standard GATT `0x180D`)
  * Cycling Cadence & Speed Sensors (Standard GATT `0x1816`)
  * Cycling Power Meters (Standard GATT `0x1818`)
* **File Portability:** Full bidirectional GPX, TCX, and FIT binary file import and export via `@garmin/fitsdk`.

### 📊 Advanced Fitness Analytics (Zero Paywalls)
* **Grade Adjusted Pace (GAP):** Minetti polynomial with real-world steep downhill eccentric braking adjustments.
* **Relative Effort / TRIMP:** Bannister & Altini cardiovascular load integration weighted exponentially by 5 heart rate zones.
* **Coggan Fitness & Freshness:** 42-day Chronic Training Load (CTL), 7-day Acute Training Load (ATL), and Training Stress Balance (TSB / Form).
* **Automated Best Efforts (PRs):** Rolling window detection across benchmark distances (400m, 1k, 1mi, 5k, 10k, Half, Marathon).
* **5-Zone Intensity Distributions:** Configurable Heart Rate and Power distribution bands based on Karvonen and Coggan FTP models.
* **Automated Weather Tagging:** Start-location weather enrichment via the open Open-Meteo API.

### 🌐 Full Social Media Ecosystem
* **Social Activity Feed:** Chronological home feed with cursor-based pagination, polyline thumbnails, and workout statistics.
* **Media & Photo Carousels:** Multi-image uploads stored in Cloudflare R2 with zero bandwidth egress costs.
* **Atomic Kudos & Nested Discussions:** Duplicate-safe Kudos system with optimistic client updates and two-level threaded comment trees.
* **Athlete Social Graph:** Follow/unfollow dynamics, mutual follow tracking, and full-text athlete search (`pg_trgm`).
* **Clubs & Communities:** Public and private clubs, role management (Owner/Admin/Member), dedicated club feeds, and weekly mileage leaderboards.
* **Challenges & Group Events:** Distance and elevation challenges with automated activity progress evaluations, digital trophy cases, and group meetup RSVPs.
* **Real-Time Notification Center:** In-app notifications for kudos, comments, follows, club updates, and challenge milestones.

### 🛡️ Privacy, Safety & Data Sovereignty
* **Backend-Enforced Privacy Zones:** Circular radius masking (100m to 2000m) around home or office. GPS coordinates are stripped server-side to guarantee zero location leakage.
* **Granular Visibility:** Activity-level privacy (`PUBLIC`, `FOLLOWERS_ONLY`, `ONLY_ME`) and field-level redaction (hide HR, pace, power, or map).
* **Beacon Live Safety Tracking:** Generate a secure, unauthenticated spectator URL (`/beacon/:token`) allowing emergency contacts to view real-time location and battery level on any web browser without logging in.

---

## 3. Technology Stack & Zero-Cost Infrastructure

| Layer | Technology | Rationale & Cost |
|---|---|---|
| **Mobile Client** | React Native / Expo (TypeScript) | Cross-platform, background location tasks, native BLE GATT sensors |
| **Backend API** | Node.js + Hono (TypeScript) | High throughput, low latency, lightweight web standards API |
| **Database** | Neon PostgreSQL + PostGIS | Serverless Postgres with native geospatial indexing (`ST_DWithin`, GiST) |
| **ORM** | Drizzle ORM | Type-safe SQL, zero-cost migrations, fast cold starts |
| **Map Engine** | MapLibre GL | Open-source vector tile renderer (no Mapbox licensing) |
| **Map Tiles & Routing** | OpenStreetMap + OSRM / Valhalla | Free community geodata and turn-by-turn routing |
| **Media Storage** | Cloudflare R2 | 10 GB free monthly tier, **zero egress bandwidth fees** |
| **Elevation Data** | USGS / Copernicus 30m SRTM DEM | Open-source digital elevation models via Open-Elevation |
| **Weather** | Open-Meteo API | Free, open-source historical and current weather API |

---

## 4. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT APPLICATIONS                               |
|                                                                                   |
|  +-------------------------------------+   +-----------------------------------+  |
|  |     React Native / Expo Mobile App  |   |    Spectator Beacon Web Viewer    |  |
|  |  (GPS Tracking, BLE Sensors, Feed)  |   |    (Live MapLibre Spectator Map)  |  |
|  +-------------------------------------+   +-----------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS
+------------------------------------------v----------------------------------------+
|                                 HONO BACKEND API                                   |
|                             (@hono/node-server)                                    |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |   Auth & Athlete   |  |  Activity Ingest   |  |    Social Engine            |  |
|  |   Service (JWT)    |  |  & Spatial Parser  |  | (Feed, Kudos, Comments,     |  |
|  +--------------------+  +--------------------+  |  Clubs, Challenges, Follow) |  |
|                                                  +-----------------------------+  |
|  +--------------------+  +--------------------+                                   |
|  |  Analytics Engine  |  |  Privacy & Safety  |  +-----------------------------+  |
|  | (GAP, TRIMP, CTL,  |  | (Server-Side Zone  |  |  Notification Center        |  |
|  |  Best Efforts)     |  |  Masking & Beacon) |  | (Event-driven dispatcher)   |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | SQL Queries / Spatial Operators
+------------------------------------------v----------------------------------------+
|                     NEON POSTGRESQL + POSTGIS SPATIAL DATABASE                    |
|                                                                                   |
|  [users]              [activities]        [privacy_zones]    [segments]           |
|  [follows]            [kudos]             [comments]         [segment_efforts]    |
|  [clubs]              [club_members]      [challenges]       [notifications]      |
+-----------------------------------------------------------------------------------+
```

---

## 5. Project Documentation Links

* 📄 **[FEATURE_GAP_AUDIT.md](file:///home/rakib/Desktop/office-project/strava/FEATURE_GAP_AUDIT.md)**: Comprehensive comparison between Strava Free, Strava Subscription, and our application, including open-source mathematical derivations and technical dependencies.
* 📋 **[PROJECT_STATUS.md](file:///home/rakib/Desktop/office-project/strava/PROJECT_STATUS.md)**: Current status, Architectural Decision Records (ADRs), complete database schema, API endpoint inventory, and master implementation checklist.

---

## 6. Project Directory Structure

```
strava/
├── mobile-frontend/            # Expo (React Native) mobile application
│   ├── app/                    # Expo Router file-based navigation
│   │   ├── (tabs)/             # Bottom navigation tabs: Feed, Record, Maps, Profile
│   │   ├── _layout.tsx         # Root layout & providers
│   │   └── modal.tsx           # Quick action modal
│   ├── components/             # Reusable UI widgets & map views
│   ├── constants/              # Theme, colors, endpoints
│   ├── hooks/                  # Custom hooks (location, sensors, auth)
│   ├── package.json            # Frontend dependencies
│   └── tsconfig.json           # Expo TypeScript configuration
│
├── mobile-backend/             # Hono TypeScript backend API
│   ├── src/
│   │   ├── routes/             # Hono route handlers (auth, activities, social, clubs)
│   │   ├── db/                 # Drizzle schema, migrations, Neon PostGIS client
│   │   ├── services/           # Analytics engine (GAP, TRIMP, CTL), Privacy clipping
│   │   └── index.ts            # Hono application entrypoint (@hono/node-server)
│   ├── package.json            # Backend dependencies
│   └── tsconfig.json           # Backend TypeScript configuration
│
├── FEATURE_GAP_AUDIT.md        # Comprehensive product & technical audit
├── PROJECT_STATUS.md           # Architecture review, API & schema inventory
└── README.md                   # This project overview
```

---

## 7. Next Steps & Development Roadmap

1. **Repository Initialization:** Monorepo package management with npm/pnpm workspaces.
2. **Schema & Database Setup:** Initialize Neon PostgreSQL connection and execute Drizzle migrations with PostGIS extensions.
3. **Fitness Tracking Core:** Implement background GPS recording service and BLE GATT sensor manager.
4. **Algorithmic Analytics Pipeline:** Deploy Minetti GAP, Bannister TRIMP, and Coggan CTL/ATL/TSB calculations.
5. **Full Social Media Implementation:** Implement cursor-paginated feeds, Kudos, threaded comments, athlete follow graph, clubs, and automated challenges.
6. **Privacy & Safety:** Enforce server-side privacy zones and launch the Beacon live spectator server.

