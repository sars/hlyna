DROP INDEX "chat"."chat_conversations_visitor_idx";--> statement-breakpoint
ALTER TABLE "chat"."conversations" ADD COLUMN "thread_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "chat_conversations_visitor_idx" ON "chat"."conversations" USING btree ("visitor_id","thread_key","status");