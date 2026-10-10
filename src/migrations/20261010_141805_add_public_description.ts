import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studios_locales" ADD COLUMN "summary" varchar;
  ALTER TABLE "studios_locales" ADD COLUMN "public_description" varchar;
  ALTER TABLE "_studios_v_locales" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_studios_v_locales" ADD COLUMN "version_public_description" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studios_locales" DROP COLUMN "summary";
  ALTER TABLE "studios_locales" DROP COLUMN "public_description";
  ALTER TABLE "_studios_v_locales" DROP COLUMN "version_summary";
  ALTER TABLE "_studios_v_locales" DROP COLUMN "version_public_description";`)
}
