import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "studios_alternate_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_studios_v_version_alternate_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "studios_alternate_names" ADD CONSTRAINT "studios_alternate_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_studios_v_version_alternate_names" ADD CONSTRAINT "_studios_v_version_alternate_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_studios_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "studios_alternate_names_order_idx" ON "studios_alternate_names" USING btree ("_order");
  CREATE INDEX "studios_alternate_names_parent_id_idx" ON "studios_alternate_names" USING btree ("_parent_id");
  CREATE INDEX "_studios_v_version_alternate_names_order_idx" ON "_studios_v_version_alternate_names" USING btree ("_order");
  CREATE INDEX "_studios_v_version_alternate_names_parent_id_idx" ON "_studios_v_version_alternate_names" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "studios_alternate_names" CASCADE;
  DROP TABLE "_studios_v_version_alternate_names" CASCADE;`)
}
