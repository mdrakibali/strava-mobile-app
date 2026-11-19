CREATE TABLE "beacon_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"athlete_id" text NOT NULL,
	"sport_type" varchar(50) DEFAULT 'Run' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_latitude" numeric(10, 6),
	"last_longitude" numeric(10, 6),
	"last_altitude" numeric(7, 2),
	"last_speed_mps" numeric(6, 2),
	"battery_percentage" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_ping_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "beacon_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sport_type" varchar(50) DEFAULT 'Run' NOT NULL,
	"distance_meters" numeric(12, 2) NOT NULL,
	"elevation_gain_meters" integer DEFAULT 0 NOT NULL,
	"estimated_time_seconds" integer NOT NULL,
	"polyline_points" jsonb NOT NULL,
	"elevation_profile" jsonb,
	"surface_types" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_routes" (
	"athlete_id" text NOT NULL,
	"route_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_routes_athlete_id_route_id_pk" PRIMARY KEY("athlete_id","route_id")
);
--> statement-breakpoint
CREATE TABLE "training_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_id" text NOT NULL,
	"title" text NOT NULL,
	"sport_type" varchar(50) DEFAULT 'Run' NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"unit" varchar(20) DEFAULT 'km' NOT NULL,
	"period" varchar(20) DEFAULT 'WEEKLY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "beacon_sessions" ADD CONSTRAINT "beacon_sessions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_creator_id_athletes_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_goals" ADD CONSTRAINT "training_goals_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_google_id_unique" UNIQUE("google_id");