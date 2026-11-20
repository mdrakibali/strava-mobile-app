CREATE TABLE "activity_upload_batches" (
	"athlete_id" text NOT NULL,
	"client_activity_id" text NOT NULL,
	"seq" integer NOT NULL,
	"points" jsonb NOT NULL,
	"point_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_upload_batches_athlete_id_client_activity_id_seq_pk" PRIMARY KEY("athlete_id","client_activity_id","seq")
);
--> statement-breakpoint
CREATE TABLE "activity_uploads" (
	"athlete_id" text NOT NULL,
	"client_activity_id" text NOT NULL,
	"sport_type" varchar(50) NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"activity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_uploads_athlete_id_client_activity_id_pk" PRIMARY KEY("athlete_id","client_activity_id")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "client_activity_id" text;--> statement-breakpoint
ALTER TABLE "activity_upload_batches" ADD CONSTRAINT "activity_upload_batches_athlete_id_client_activity_id_activity_uploads_athlete_id_client_activity_id_fk" FOREIGN KEY ("athlete_id","client_activity_id") REFERENCES "public"."activity_uploads"("athlete_id","client_activity_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_uploads" ADD CONSTRAINT "activity_uploads_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_uploads" ADD CONSTRAINT "activity_uploads_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_athlete_client_idx" ON "activities" USING btree ("athlete_id","client_activity_id");--> statement-breakpoint
CREATE INDEX "activities_athlete_start_idx" ON "activities" USING btree ("athlete_id","start_time");