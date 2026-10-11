import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_requests_what" ADD VALUE 'studio';
  ALTER TABLE "requests" ADD COLUMN "studio_name" varchar;
  ALTER TABLE "requests" ADD COLUMN "studio_links" varchar;
  ALTER TABLE "requests" ADD COLUMN "photo_consent" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "requests" ALTER COLUMN "what" SET DATA TYPE text;
  DROP TYPE "public"."enum_requests_what";
  CREATE TYPE "public"."enum_requests_what" AS ENUM('tableware', 'logo-mugs', 'corporate-gifts', 'corporate-workshop', 'master-class', 'other');
  ALTER TABLE "requests" ALTER COLUMN "what" SET DATA TYPE "public"."enum_requests_what" USING "what"::"public"."enum_requests_what";
  ALTER TABLE "requests" DROP COLUMN "studio_name";
  ALTER TABLE "requests" DROP COLUMN "studio_links";
  ALTER TABLE "requests" DROP COLUMN "photo_consent";`)
}
