CREATE TABLE IF NOT EXISTS "chats" (
  "id" text PRIMARY KEY NOT NULL,
  "athlete1_id" text NOT NULL,
  "athlete2_id" text NOT NULL,
  "last_message" text,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "unique_chat_participants" UNIQUE ("athlete1_id", "athlete2_id")
);--> statement-breakpoint
ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "chat_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_chat_idx" ON "direct_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chats_athlete1_idx" ON "chats" USING btree ("athlete1_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chats_athlete2_idx" ON "chats" USING btree ("athlete2_id");
