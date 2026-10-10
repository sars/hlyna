import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_studios_formats" AS ENUM('wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop', 'corporate-gifts', 'logo', 'horeca', 'new-year');
  CREATE TYPE "public"."enum__studios_v_version_formats" AS ENUM('wheel', 'handbuilding', 'painting', 'kids', 'couples', 'courses', 'certificates', 'corporate-workshop', 'corporate-gifts', 'logo', 'horeca', 'new-year');
  CREATE TABLE "studios_formats" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_studios_formats",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_studios_v_version_formats" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__studios_v_version_formats",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "studios_formats" ADD CONSTRAINT "studios_formats_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_studios_v_version_formats" ADD CONSTRAINT "_studios_v_version_formats_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_studios_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "studios_formats_order_idx" ON "studios_formats" USING btree ("order");
  CREATE INDEX "studios_formats_parent_idx" ON "studios_formats" USING btree ("parent_id");
  CREATE INDEX "studios_formats_value_idx" ON "studios_formats" USING btree ("value");
  CREATE INDEX "_studios_v_version_formats_order_idx" ON "_studios_v_version_formats" USING btree ("order");
  CREATE INDEX "_studios_v_version_formats_parent_idx" ON "_studios_v_version_formats" USING btree ("parent_id");
  CREATE INDEX "_studios_v_version_formats_value_idx" ON "_studios_v_version_formats" USING btree ("value");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "studios_formats" CASCADE;
  DROP TABLE "_studios_v_version_formats" CASCADE;
  DROP TYPE "public"."enum_studios_formats";
  DROP TYPE "public"."enum__studios_v_version_formats";`)
}
