CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."change_set_status" AS ENUM('pending', 'applied', 'partially_applied', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "app"."claim_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "app"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "app"."geo_precision" AS ENUM('address', 'street', 'settlement');--> statement-breakpoint
CREATE TYPE "app"."media_status" AS ENUM('active', 'pending', 'orphan');--> statement-breakpoint
CREATE TYPE "app"."request_status" AS ENUM('new', 'in_progress', 'forwarded', 'replied', 'deal', 'lost', 'closed');--> statement-breakpoint
CREATE TYPE "app"."request_what" AS ENUM('tableware', 'logo-mugs', 'corporate-gifts', 'corporate-workshop', 'master-class', 'other', 'studio');--> statement-breakpoint
CREATE TYPE "app"."studio_status" AS ENUM('active', 'unclear', 'closed', 'relocated');--> statement-breakpoint
CREATE TYPE "app"."studio_type" AS ENUM('studio', 'brand', 'maker', 'school', 'shop', 'supplier', 'heritage', 'other');--> statement-breakpoint
CREATE TYPE "app"."studio_visibility" AS ENUM('public', 'hidden');--> statement-breakpoint
CREATE TYPE "app"."user_role" AS ENUM('admin', 'editor', 'owner');--> statement-breakpoint
CREATE TABLE "app"."cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"oblast" text,
	"population" integer,
	"is_over_100k" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app"."media" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"mime" text,
	"size" integer,
	"width" integer,
	"height" integer,
	"sha256" text,
	"alt" text,
	"caption" text,
	"focal_x" double precision,
	"focal_y" double precision,
	"variants" jsonb,
	"status" "app"."media_status" DEFAULT 'active' NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "app"."studio_photos" (
	"studio_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "studio_photos_studio_id_media_id_pk" PRIMARY KEY("studio_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "app"."studio_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"studio_id" integer NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"source" text,
	"date_text" text
);
--> statement-breakpoint
CREATE TABLE "app"."studio_slug_history" (
	"old_slug" text PRIMARY KEY NOT NULL,
	"studio_id" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."studios" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "app"."studio_type",
	"status" "app"."studio_status",
	"visibility" "app"."studio_visibility" DEFAULT 'hidden' NOT NULL,
	"confidence" "app"."confidence",
	"source_id" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"city_id" integer,
	"oblast" text,
	"address" text,
	"geo_lat" double precision,
	"geo_lng" double precision,
	"geo_precision" "app"."geo_precision",
	"geo_geocoded_at" timestamp with time zone,
	"geo_source" text,
	"summary" text,
	"public_description" text,
	"recent_note" text,
	"description_internal" text,
	"owner_about" text,
	"owner_news" text,
	"owner_quote" text,
	"owner_quote_approved" boolean,
	"instagram" text,
	"website" text,
	"facebook" text,
	"phone" text,
	"email" text,
	"b2b_min_order" text,
	"b2b_lead_time" text,
	"b2b_food_safe" boolean,
	"b2b_dishwasher_safe" boolean,
	"b2b_works_with_horeca" boolean,
	"b2b_works_with_corporate" boolean,
	"activity_last_post_date" timestamp with time zone,
	"activity_posts_90d" integer,
	"activity_followers" integer,
	"activity_website_alive" boolean,
	"activity_etsy_sales" integer,
	"activity_checked_at" timestamp with time zone,
	"consent_photos" boolean,
	"consent_requests" boolean,
	"consent_contacted_at" timestamp with time zone,
	"consent_notes" text,
	"owner_verified" boolean,
	"alternate_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"formats" text[] DEFAULT '{}'::text[] NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"products" text[] DEFAULT '{}'::text[] NOT NULL,
	"sales_channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"other_links" text[] DEFAULT '{}'::text[] NOT NULL,
	"sources" text[] DEFAULT '{}'::text[] NOT NULL,
	"instagram_posts" text[] DEFAULT '{}'::text[] NOT NULL,
	"b2b_logo_methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "studios_formats_known" CHECK ("formats" <@ ARRAY['wheel','handbuilding','painting','kids','couples','courses','certificates','corporate-workshop','corporate-gifts','logo','horeca','new-year']::text[]),
	CONSTRAINT "studios_instagram_posts_max3" CHECK (cardinality("instagram_posts") <= 3)
);
--> statement-breakpoint
CREATE TABLE "app"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."invite_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"link" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "invite_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "app"."rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" integer NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "app"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app"."studio_owner" (
	"user_id" text NOT NULL,
	"studio_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"granted_by" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_owner_user_id_studio_id_pk" PRIMARY KEY("user_id","studio_id")
);
--> statement-breakpoint
CREATE TABLE "app"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"role" "app"."user_role" DEFAULT 'owner' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"contact" text,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"legacy_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "app"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."claim_studios" (
	"claim_id" integer NOT NULL,
	"studio_id" integer NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "claim_studios_claim_id_studio_id_pk" PRIMARY KEY("claim_id","studio_id")
);
--> statement-breakpoint
CREATE TABLE "app"."claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "app"."claim_status" DEFAULT 'pending' NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"represents" boolean,
	"reject_reason" text,
	"link_to_owner_id" text,
	"owner_id" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "app"."request_studios" (
	"request_id" integer NOT NULL,
	"studio_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "request_studios_request_id_studio_id_pk" PRIMARY KEY("request_id","studio_id")
);
--> statement-breakpoint
CREATE TABLE "app"."requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"what" "app"."request_what" NOT NULL,
	"details" text,
	"studio_name" text,
	"studio_links" text,
	"photo_consent" boolean,
	"quantity" text,
	"deadline" text,
	"budget_per_item" text,
	"city" text,
	"logo" boolean,
	"contact_name" text,
	"contact_phone_or_telegram" text,
	"contact_email" text,
	"source_page" text,
	"status" "app"."request_status" DEFAULT 'new' NOT NULL,
	"deal_amount_kop" bigint,
	"commission_kop" bigint GENERATED ALWAYS AS (CASE WHEN deal_amount_kop > 0 THEN round(deal_amount_kop * 5 / 100.0)::bigint ELSE NULL END) STORED,
	"notes" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "app"."audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb,
	"source" text,
	"request_id" text
);
--> statement-breakpoint
CREATE TABLE "app"."change_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"studio_id" integer NOT NULL,
	"author_id" text,
	"status" "app"."change_set_status" DEFAULT 'pending' NOT NULL,
	"base_revision" integer,
	"proposed" jsonb NOT NULL,
	"new_media_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"applied_fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"script" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"counts" jsonb,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "app"."jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."studio_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"studio_id" integer NOT NULL,
	"revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"actor_id" text,
	"source" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."studio_photos" ADD CONSTRAINT "studio_photos_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."studio_prices" ADD CONSTRAINT "studio_prices_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."studio_slug_history" ADD CONSTRAINT "studio_slug_history_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."studios" ADD CONSTRAINT "studios_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "app"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invite_links" ADD CONSTRAINT "invite_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."studio_owner" ADD CONSTRAINT "studio_owner_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."studio_owner" ADD CONSTRAINT "studio_owner_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."claim_studios" ADD CONSTRAINT "claim_studios_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "app"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."claim_studios" ADD CONSTRAINT "claim_studios_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."claims" ADD CONSTRAINT "claims_link_to_owner_id_user_id_fk" FOREIGN KEY ("link_to_owner_id") REFERENCES "app"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."claims" ADD CONSTRAINT "claims_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."request_studios" ADD CONSTRAINT "request_studios_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "app"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."request_studios" ADD CONSTRAINT "request_studios_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_sets" ADD CONSTRAINT "change_sets_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."studio_revisions" ADD CONSTRAINT "studio_revisions_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "app"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_file_name_uq" ON "app"."media" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "studio_prices_studio_idx" ON "app"."studio_prices" USING btree ("studio_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "studios_slug_uq" ON "app"."studios" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "studios_source_id_uq" ON "app"."studios" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "studios_city_idx" ON "app"."studios" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "studios_visibility_idx" ON "app"."studios" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "studios_horeca_idx" ON "app"."studios" USING btree ("b2b_works_with_horeca");--> statement-breakpoint
CREATE INDEX "studios_consent_requests_idx" ON "app"."studios" USING btree ("consent_requests");--> statement-breakpoint
CREATE INDEX "studios_formats_gin" ON "app"."studios" USING gin ("formats");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "app"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "app"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "studio_owner_studio_idx" ON "app"."studio_owner" USING btree ("studio_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "app"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "app"."claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "requests_status_idx" ON "app"."requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "requests_created_idx" ON "app"."requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "app"."audit_log" USING btree ("entity","entity_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "app"."audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "change_sets_status_idx" ON "app"."change_sets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "change_sets_one_pending_uq" ON "app"."change_sets" USING btree ("studio_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "jobs_queue_idx" ON "app"."jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "studio_revisions_studio_idx" ON "app"."studio_revisions" USING btree ("studio_id","created_at");