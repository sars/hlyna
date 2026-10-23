CREATE TYPE "app"."delivery_method" AS ENUM('np_branch', 'np_postomat', 'np_courier', 'ukrposhta', 'pickup', 'none');--> statement-breakpoint
CREATE TYPE "app"."item_fulfillment" AS ENUM('ship', 'digital');--> statement-breakpoint
CREATE TYPE "app"."order_status" AS ENUM('new', 'confirmed', 'in_progress', 'shipped', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "app"."payment_method" AS ENUM('transfer', 'on_delivery', 'card_online');--> statement-breakpoint
CREATE TYPE "app"."payment_status" AS ENUM('unpaid', 'paid', 'refunded');--> statement-breakpoint
ALTER TYPE "app"."item_category" ADD VALUE 'svichky';--> statement-breakpoint
ALTER TYPE "app"."item_category" ADD VALUE 'sertyfikaty';--> statement-breakpoint
CREATE TABLE "app"."item_photos" (
	"item_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "item_photos_item_id_media_id_pk" PRIMARY KEY("item_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "app"."order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"item_id" integer,
	"title" text NOT NULL,
	"item_path" text,
	"unit_kop" bigint NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"options" jsonb
);
--> statement-breakpoint
CREATE TABLE "app"."orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"studio_id" integer NOT NULL,
	"checkout_token" text NOT NULL,
	"status" "app"."order_status" DEFAULT 'new' NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"buyer_email" text,
	"no_call" boolean DEFAULT false NOT NULL,
	"comment" text,
	"delivery_method" "app"."delivery_method" NOT NULL,
	"delivery_city" text,
	"delivery_point" text,
	"delivery_kop" bigint,
	"payment_method" "app"."payment_method" NOT NULL,
	"payment_status" "app"."payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_provider" text,
	"payment_ref" text,
	"payment_payload" jsonb,
	"paid_at" timestamp with time zone,
	"subtotal_kop" bigint NOT NULL,
	"commission_kop" bigint GENERATED ALWAYS AS (round(subtotal_kop * 10 / 100.0)::bigint) STORED,
	"tracking" text,
	"studio_note" text,
	"cancel_reason" text,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"offer_version" text NOT NULL,
	"source_page" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "app"."studios" ADD COLUMN "shop_terms" jsonb;--> statement-breakpoint
ALTER TABLE "app"."items" ADD COLUMN "fulfillment" "app"."item_fulfillment" DEFAULT 'ship' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."items" ADD COLUMN "specs" jsonb;--> statement-breakpoint
ALTER TABLE "app"."items" ADD COLUMN "lead_days_min" integer;--> statement-breakpoint
ALTER TABLE "app"."items" ADD COLUMN "lead_days_max" integer;--> statement-breakpoint
ALTER TABLE "app"."items" ADD COLUMN "stock" integer;--> statement-breakpoint
ALTER TABLE "app"."user" ADD COLUMN "telegram_chat_id" bigint;--> statement-breakpoint
ALTER TABLE "app"."user" ADD COLUMN "telegram_link_token" text;--> statement-breakpoint
ALTER TABLE "app"."item_photos" ADD CONSTRAINT "item_photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "app"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."item_photos" ADD CONSTRAINT "item_photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "app"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_items" ADD CONSTRAINT "order_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "app"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "app"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_studio_status_idx" ON "app"."orders" USING btree ("studio_id","status");--> statement-breakpoint
CREATE INDEX "orders_checkout_idx" ON "app"."orders" USING btree ("checkout_token");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "app"."orders" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "app"."user" ADD CONSTRAINT "user_telegram_link_token_unique" UNIQUE("telegram_link_token");