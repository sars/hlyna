CREATE TABLE "app"."city_slug_history" (
	"old_slug" text PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."cities" ADD COLUMN "locative" text;--> statement-breakpoint
ALTER TABLE "app"."city_slug_history" ADD CONSTRAINT "city_slug_history_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "app"."cities"("id") ON DELETE cascade ON UPDATE no action;