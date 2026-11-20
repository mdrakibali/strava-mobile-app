CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sport_type" varchar(50) NOT NULL,
	"visibility" varchar(20) DEFAULT 'PUBLIC' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"distance_meters" numeric(12, 2) NOT NULL,
	"moving_time_seconds" integer NOT NULL,
	"elapsed_time_seconds" integer NOT NULL,
	"elevation_gain_meters" integer DEFAULT 0 NOT NULL,
	"average_speed_mps" numeric(6, 2),
	"max_speed_mps" numeric(6, 2),
	"average_heart_rate" integer,
	"max_heart_rate" integer,
	"calories" integer,
	"relative_effort_score" integer,
	"gap_formatted" text,
	"raw_polyline" jsonb,
	"masked_polyline" jsonb,
	"splits" jsonb,
	"elevation_profile" jsonb,
	"photos" jsonb,
	"gear_id" text,
	"exclude_from_feed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"city" varchar(100),
	"country" varchar(100),
	"bio" text,
	"weight_kg" numeric(5, 2),
	"height_cm" numeric(5, 2),
	"max_hr" integer,
	"resting_hr" integer,
	"ftp_watts" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athletes_username_unique" UNIQUE("username"),
	CONSTRAINT "athletes_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "challenge_participants" (
	"challenge_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"current_meters" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_participants_challenge_id_athlete_id_pk" PRIMARY KEY("challenge_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sport_type" varchar(50) NOT NULL,
	"target_meters" numeric(12, 2) NOT NULL,
	"badge_url" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_members" (
	"club_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"role" varchar(20) DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_members_club_id_athlete_id_pk" PRIMARY KEY("club_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sport_type" varchar(50) NOT NULL,
	"city" varchar(100),
	"country" varchar(100),
	"description" text,
	"avatar_url" text,
	"banner_url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"parent_comment_id" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"text" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"event_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"status" varchar(20) DEFAULT 'GOING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_rsvps_event_id_athlete_id_pk" PRIMARY KEY("event_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "gear" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"sport_type" varchar(20) NOT NULL,
	"distance_meters" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_distance_meters" numeric(12, 2) DEFAULT '500000' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_retired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sport_type" varchar(50) NOT NULL,
	"club_id" text,
	"creator_id" text NOT NULL,
	"meeting_point" text NOT NULL,
	"pace_description" text,
	"distance_meters" numeric(10, 2),
	"event_date" timestamp with time zone NOT NULL,
	"route_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kudos" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action_type" varchar(30) NOT NULL,
	"target_activity_id" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_id" text NOT NULL,
	"name" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"radius_meters" integer DEFAULT 500 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_efforts" (
	"id" text PRIMARY KEY NOT NULL,
	"segment_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"athlete_id" text NOT NULL,
	"elapsed_time_seconds" integer NOT NULL,
	"average_speed_mps" numeric(6, 2),
	"average_heart_rate" integer,
	"achieved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sport_type" varchar(50) NOT NULL,
	"distance_meters" numeric(10, 2) NOT NULL,
	"average_grade_percent" numeric(5, 2),
	"elevation_gain_meters" integer DEFAULT 0,
	"start_latitude" numeric(10, 6) NOT NULL,
	"start_longitude" numeric(10, 6) NOT NULL,
	"end_latitude" numeric(10, 6) NOT NULL,
	"end_longitude" numeric(10, 6) NOT NULL,
	"polyline_points" jsonb NOT NULL,
	"creator_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_athletes_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_creator_id_athletes_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_athletes_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_athletes_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_athletes_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_athletes_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_creator_id_athletes_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_athletes_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_athletes_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_zones" ADD CONSTRAINT "privacy_zones_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_efforts" ADD CONSTRAINT "segment_efforts_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_efforts" ADD CONSTRAINT "segment_efforts_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_efforts" ADD CONSTRAINT "segment_efforts_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_creator_id_athletes_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."athletes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kudos_unique_idx" ON "kudos" USING btree ("activity_id","athlete_id");