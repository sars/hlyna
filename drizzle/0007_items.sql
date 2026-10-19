CREATE TYPE "app"."item_availability" AS ENUM('in_stock', 'to_order', 'unknown', 'sold');--> statement-breakpoint
CREATE TYPE "app"."item_category" AS ENUM('chashky', 'tarilky-i-mysky', 'vazy-i-dekor', 'svitylnyky', 'prykrasy', 'plytka-i-panno');--> statement-breakpoint
CREATE TYPE "app"."item_hidden_reason" AS ENUM('stale', 'no_date', 'sold', 'gone', 'season_over', 'studio_hidden', 'manual');--> statement-breakpoint
CREATE TYPE "app"."item_kind" AS ENUM('piece', 'series', 'to_order');--> statement-breakpoint
CREATE TYPE "app"."item_signal" AS ENUM('none', 'available', 'sold', 'gone', 'price_changed', 'caption_changed', 'reposted');--> statement-breakpoint
CREATE TYPE "app"."item_source" AS ENUM('instagram', 'shop');--> statement-breakpoint
CREATE TABLE "app"."item_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text,
	"post_alive" boolean,
	"signal" "app"."item_signal" DEFAULT 'none' NOT NULL,
	"price_seen" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "app"."items" (
	"id" serial PRIMARY KEY NOT NULL,
	"studio_id" integer NOT NULL,
	"slug" text NOT NULL,
	"source" "app"."item_source" NOT NULL,
	"source_url" text NOT NULL,
	"source_key" text NOT NULL,
	"posted_at" date,
	"title" text NOT NULL,
	"category" "app"."item_category" NOT NULL,
	"occasion" text,
	"season_ends" date,
	"kind" "app"."item_kind" DEFAULT 'series' NOT NULL,
	"price_text" text,
	"price_min" integer,
	"price_max" integer,
	"availability" "app"."item_availability" DEFAULT 'unknown' NOT NULL,
	"availability_text" text,
	"confirmed_at" date,
	"description" text,
	"photo_fact" text,
	"terms" text,
	"embed" text,
	"source_gone" boolean DEFAULT false NOT NULL,
	"visibility" "app"."studio_visibility" DEFAULT 'hidden' NOT NULL,
	"hidden_reason" "app"."item_hidden_reason",
	"last_checked_at" timestamp with time zone,
	"evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "app"."requests" drop column "commission_kop";--> statement-breakpoint
ALTER TABLE "app"."requests" ADD COLUMN "commission_kop" bigint GENERATED ALWAYS AS (CASE WHEN deal_amount_kop > 0 THEN round(deal_amount_kop * 10 / 100.0)::bigint ELSE NULL END) STORED;--> statement-breakpoint
ALTER TABLE "app"."requests" ADD COLUMN "item_id" integer;--> statement-breakpoint
ALTER TABLE "app"."item_checks" ADD CONSTRAINT "item_checks_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "app"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."items" ADD CONSTRAINT "items_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_checks_item_idx" ON "app"."item_checks" USING btree ("item_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "items_studio_slug_uq" ON "app"."items" USING btree ("studio_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "items_studio_source_key_uq" ON "app"."items" USING btree ("studio_id","source_key");--> statement-breakpoint
CREATE INDEX "items_category_visibility_idx" ON "app"."items" USING btree ("category","visibility");--> statement-breakpoint
ALTER TABLE "app"."requests" ADD CONSTRAINT "requests_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "app"."items"("id") ON DELETE set null ON UPDATE no action;