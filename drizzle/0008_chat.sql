CREATE SCHEMA "chat";
--> statement-breakpoint
CREATE TYPE "chat"."chat_role" AS ENUM('visitor', 'assistant', 'human', 'system');--> statement-breakpoint
CREATE TYPE "chat"."chat_status" AS ENUM('ai', 'waiting', 'human', 'closed');--> statement-breakpoint
CREATE TABLE "chat"."conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"status" "chat"."chat_status" DEFAULT 'ai' NOT NULL,
	"page" text NOT NULL,
	"kind" text NOT NULL,
	"last_page" text,
	"context" jsonb,
	"contact_type" text,
	"contact" text,
	"request_id" integer,
	"tg_head_message_id" bigint,
	"visitor_tg_chat_id" bigint,
	"human_joined_at" timestamp with time zone,
	"handoff_at" timestamp with time zone,
	"contact_asked_at" timestamp with time zone,
	"last_visitor_at" timestamp with time zone,
	"last_human_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"ip_hash" text,
	"turns" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "chat"."events" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"type" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat"."messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" "chat"."chat_role" NOT NULL,
	"text" text NOT NULL,
	"meta" jsonb,
	"tg_message_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat"."state" (
	"key" text PRIMARY KEY NOT NULL,
	"online" boolean,
	"manual" text,
	"last_active_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat"."events" ADD CONSTRAINT "events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "chat"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "chat"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_conversations_visitor_idx" ON "chat"."conversations" USING btree ("visitor_id","status");--> statement-breakpoint
CREATE INDEX "chat_conversations_created_idx" ON "chat"."conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_conversations_head_idx" ON "chat"."conversations" USING btree ("tg_head_message_id");--> statement-breakpoint
CREATE INDEX "chat_events_conversation_idx" ON "chat"."events" USING btree ("conversation_id","id");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_idx" ON "chat"."messages" USING btree ("conversation_id","id");--> statement-breakpoint
CREATE INDEX "chat_messages_tg_idx" ON "chat"."messages" USING btree ("tg_message_id");