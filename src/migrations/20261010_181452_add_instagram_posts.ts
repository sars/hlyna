import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "studios_activity_instagram_posts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "_studios_v_version_activity_instagram_posts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "studios_locales" ADD COLUMN "recent_note" varchar;
  ALTER TABLE "_studios_v_locales" ADD COLUMN "version_recent_note" varchar;
  ALTER TABLE "studios_activity_instagram_posts" ADD CONSTRAINT "studios_activity_instagram_posts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_studios_v_version_activity_instagram_posts" ADD CONSTRAINT "_studios_v_version_activity_instagram_posts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_studios_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "studios_activity_instagram_posts_order_idx" ON "studios_activity_instagram_posts" USING btree ("_order");
  CREATE INDEX "studios_activity_instagram_posts_parent_id_idx" ON "studios_activity_instagram_posts" USING btree ("_parent_id");
  CREATE INDEX "_studios_v_version_activity_instagram_posts_order_idx" ON "_studios_v_version_activity_instagram_posts" USING btree ("_order");
  CREATE INDEX "_studios_v_version_activity_instagram_posts_parent_id_idx" ON "_studios_v_version_activity_instagram_posts" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "studios_activity_instagram_posts" CASCADE;
  DROP TABLE "_studios_v_version_activity_instagram_posts" CASCADE;
  ALTER TABLE "studios_locales" DROP COLUMN "recent_note";
  ALTER TABLE "_studios_v_locales" DROP COLUMN "version_recent_note";`)
}
