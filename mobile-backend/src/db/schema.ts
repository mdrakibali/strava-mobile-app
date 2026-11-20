import {
  boolean,
  decimal,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// 1. Athletes (Users) Table
export const athletes = pgTable('athletes', {
  id: text('id').primaryKey(),
  googleId: text('google_id').unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  bio: text('bio'),
  weightKg: decimal('weight_kg', { precision: 5, scale: 2 }),
  heightCm: decimal('height_cm', { precision: 5, scale: 2 }),
  maxHr: integer('max_hr'),
  restingHr: integer('resting_hr'),
  ftpWatts: integer('ftp_watts'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Athlete Social Graph (Follows)
export const follows = pgTable(
  'follows',
  {
    followerId: text('follower_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
  ]
);

// 3. Privacy Zones Table (Home/Office Coordinate Masking)
export const privacyZones = pgTable('privacy_zones', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 6 }).notNull(),
  radiusMeters: integer('radius_meters').default(500).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Activities Table
export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sportType: varchar('sport_type', { length: 50 }).notNull(),
  visibility: varchar('visibility', { length: 20 }).default('PUBLIC').notNull(), // PUBLIC, FOLLOWERS_ONLY, ONLY_ME
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  distanceMeters: decimal('distance_meters', { precision: 12, scale: 2 }).notNull(),
  movingTimeSeconds: integer('moving_time_seconds').notNull(),
  elapsedTimeSeconds: integer('elapsed_time_seconds').notNull(),
  elevationGainMeters: integer('elevation_gain_meters').default(0).notNull(),
  averageSpeedMps: decimal('average_speed_mps', { precision: 6, scale: 2 }),
  maxSpeedMps: decimal('max_speed_mps', { precision: 6, scale: 2 }),
  averageHeartRate: integer('average_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  calories: integer('calories'),
  relativeEffortScore: integer('relative_effort_score'),
  gapFormatted: text('gap_formatted'),
  rawPolyline: jsonb('raw_polyline'), // Accessible only by author
  maskedPolyline: jsonb('masked_polyline'), // Privacy clipped polyline for feed/public
  splits: jsonb('splits'), // Array of SplitItem
  elevationProfile: jsonb('elevation_profile'), // Array of altitudes
  photos: jsonb('photos'),
  gearId: text('gear_id'),
  excludeFromFeed: boolean('exclude_from_feed').default(false).notNull(),
  /** Client-generated UUID of the recording; makes uploads idempotent (ADR-06). Null for legacy rows. */
  clientActivityId: text('client_activity_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('activities_athlete_client_idx').on(table.athleteId, table.clientActivityId),
  index('activities_athlete_start_idx').on(table.athleteId, table.startTime),
]);

/**
 * Staged GPS uploads (batch sync). One row per recording, keyed by the client's UUID within the
 * athlete, so ids can't collide across athletes and nobody can touch someone else's upload.
 * Drafts never appear in feeds: the activities row is only created on /complete.
 */
export const activityUploads = pgTable('activity_uploads', {
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  clientActivityId: text('client_activity_id').notNull(),
  sportType: varchar('sport_type', { length: 50 }).notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).default('OPEN').notNull(), // OPEN | COMPLETED
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.athleteId, table.clientActivityId] }),
]);

export const activityUploadBatches = pgTable('activity_upload_batches', {
  athleteId: text('athlete_id').notNull(),
  clientActivityId: text('client_activity_id').notNull(),
  seq: integer('seq').notNull(),
  /** WirePoint[]: [t, lat, lng, acc, alt, altAcc, speed, seg] */
  points: jsonb('points').notNull(),
  pointCount: integer('point_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.athleteId, table.clientActivityId, table.seq] }),
  foreignKey({
    columns: [table.athleteId, table.clientActivityId],
    foreignColumns: [activityUploads.athleteId, activityUploads.clientActivityId],
  }).onDelete('cascade'),
]);

// 5. Kudos (Likes) Table
export const kudos = pgTable(
  'kudos',
  {
    id: text('id').primaryKey(),
    activityId: text('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('kudos_unique_idx').on(table.activityId, table.athleteId),
  ]
);

// 6. Comments Table (Threaded / Nested Discussions)
export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  activityId: text('activity_id')
    .notNull()
    .references(() => activities.id, { onDelete: 'cascade' }),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  parentCommentId: text('parent_comment_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Clubs Table
export const clubs = pgTable('clubs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sportType: varchar('sport_type', { length: 50 }).notNull(),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  isPrivate: boolean('is_private').default(false).notNull(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Club Members Table
export const clubMembers = pgTable(
  'club_members',
  {
    clubId: text('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('MEMBER').notNull(), // OWNER, ADMIN, MEMBER
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.athleteId] }),
  ]
);

// 9. Challenges Table
export const challenges = pgTable('challenges', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  sportType: varchar('sport_type', { length: 50 }).notNull(),
  targetMeters: decimal('target_meters', { precision: 12, scale: 2 }).notNull(),
  badgeUrl: text('badge_url'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Challenge Participants Table
export const challengeParticipants = pgTable(
  'challenge_participants',
  {
    challengeId: text('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    currentMeters: decimal('current_meters', { precision: 12, scale: 2 }).default('0').notNull(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.challengeId, table.athleteId] }),
  ]
);

// 11. Group Events Table
export const groupEvents = pgTable('group_events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  sportType: varchar('sport_type', { length: 50 }).notNull(),
  clubId: text('club_id').references(() => clubs.id, { onDelete: 'set null' }),
  creatorId: text('creator_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  meetingPoint: text('meeting_point').notNull(),
  paceDescription: text('pace_description'),
  distanceMeters: decimal('distance_meters', { precision: 10, scale: 2 }),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  routeId: text('route_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. Event RSVPs Table
export const eventRsvps = pgTable(
  'event_rsvps',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => groupEvents.id, { onDelete: 'cascade' }),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('GOING').notNull(), // GOING, MAYBE, DECLINED
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.athleteId] }),
  ]
);

// 13. Segments Table
export const segments = pgTable('segments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sportType: varchar('sport_type', { length: 50 }).notNull(),
  distanceMeters: decimal('distance_meters', { precision: 10, scale: 2 }).notNull(),
  averageGradePercent: decimal('average_grade_percent', { precision: 5, scale: 2 }),
  elevationGainMeters: integer('elevation_gain_meters').default(0),
  startLatitude: decimal('start_latitude', { precision: 10, scale: 6 }).notNull(),
  startLongitude: decimal('start_longitude', { precision: 10, scale: 6 }).notNull(),
  endLatitude: decimal('end_latitude', { precision: 10, scale: 6 }).notNull(),
  endLongitude: decimal('end_longitude', { precision: 10, scale: 6 }).notNull(),
  polylinePoints: jsonb('polyline_points').notNull(),
  creatorId: text('creator_id').references(() => athletes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Segment Efforts (KOM / PRs)
export const segmentEfforts = pgTable('segment_efforts', {
  id: text('id').primaryKey(),
  segmentId: text('segment_id')
    .notNull()
    .references(() => segments.id, { onDelete: 'cascade' }),
  activityId: text('activity_id')
    .notNull()
    .references(() => activities.id, { onDelete: 'cascade' }),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  elapsedTimeSeconds: integer('elapsed_time_seconds').notNull(),
  averageSpeedMps: decimal('average_speed_mps', { precision: 6, scale: 2 }),
  averageHeartRate: integer('average_heart_rate'),
  achievedAt: timestamp('achieved_at', { withTimezone: true }).notNull(),
});

// 15. Gear / Equipment (Shoes & Bikes)
export const gear = pgTable('gear', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  sportType: varchar('sport_type', { length: 20 }).notNull(), // Run, Ride
  distanceMeters: decimal('distance_meters', { precision: 12, scale: 2 }).default('0').notNull(),
  maxDistanceMeters: decimal('max_distance_meters', { precision: 12, scale: 2 }).default('500000').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  isRetired: boolean('is_retired').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 16. In-App Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  actorId: text('actor_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  actionType: varchar('action_type', { length: 30 }).notNull(), // KUDOS, COMMENT, FOLLOW, CHALLENGE_WON
  targetActivityId: text('target_activity_id'),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Direct Messaging (Chat) Table
export const directMessages = pgTable('direct_messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 18. Live Beacon Safety Tracking (Spectator Mode)
export const beaconSessions = pgTable('beacon_sessions', {
  id: text('id').primaryKey(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  sportType: varchar('sport_type', { length: 50 }).default('Run').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLatitude: decimal('last_latitude', { precision: 10, scale: 6 }),
  lastLongitude: decimal('last_longitude', { precision: 10, scale: 6 }),
  lastAltitude: decimal('last_altitude', { precision: 7, scale: 2 }),
  lastSpeedMps: decimal('last_speed_mps', { precision: 6, scale: 2 }),
  batteryPercentage: integer('battery_percentage'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  lastPingAt: timestamp('last_ping_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

// 19. Routes Table (Community and User Created Routes)
export const routes = pgTable('routes', {
  id: text('id').primaryKey(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sportType: varchar('sport_type', { length: 50 }).default('Run').notNull(),
  distanceMeters: decimal('distance_meters', { precision: 12, scale: 2 }).notNull(),
  elevationGainMeters: integer('elevation_gain_meters').default(0).notNull(),
  estimatedTimeSeconds: integer('estimated_time_seconds').notNull(),
  polylinePoints: jsonb('polyline_points').notNull(),
  elevationProfile: jsonb('elevation_profile'),
  surfaceTypes: jsonb('surface_types'),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 20. Saved Routes Table (Bookmarks & Favorites)
export const savedRoutes = pgTable(
  'saved_routes',
  {
    athleteId: text('athlete_id')
      .notNull()
      .references(() => athletes.id, { onDelete: 'cascade' }),
    routeId: text('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.athleteId, table.routeId] }),
  ]
);

// 21. Training Goals Table
export const trainingGoals = pgTable('training_goals', {
  id: text('id').primaryKey(),
  athleteId: text('athlete_id')
    .notNull()
    .references(() => athletes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sportType: varchar('sport_type', { length: 50 }).default('Run').notNull(),
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).default('km').notNull(),
  period: varchar('period', { length: 20 }).default('WEEKLY').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});



