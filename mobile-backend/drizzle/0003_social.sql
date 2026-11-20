ALTER TABLE "comments" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "comments_activity_created_idx" ON "comments" USING btree ("activity_id","created_at");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id","created_at");--> statement-breakpoint
CREATE INDEX "kudos_athlete_idx" ON "kudos" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_id","created_at");