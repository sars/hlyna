import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studios" ADD COLUMN "owner_about" varchar;
  ALTER TABLE "studios" ADD COLUMN "owner_news" varchar;
  ALTER TABLE "studios" ADD COLUMN "owner_quote" varchar;
  ALTER TABLE "studios" ADD COLUMN "owner_quote_approved" boolean DEFAULT false;
  ALTER TABLE "_studios_v" ADD COLUMN "version_owner_about" varchar;
  ALTER TABLE "_studios_v" ADD COLUMN "version_owner_news" varchar;
  ALTER TABLE "_studios_v" ADD COLUMN "version_owner_quote" varchar;
  ALTER TABLE "_studios_v" ADD COLUMN "version_owner_quote_approved" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studios" DROP COLUMN "owner_about";
  ALTER TABLE "studios" DROP COLUMN "owner_news";
  ALTER TABLE "studios" DROP COLUMN "owner_quote";
  ALTER TABLE "studios" DROP COLUMN "owner_quote_approved";
  ALTER TABLE "_studios_v" DROP COLUMN "version_owner_about";
  ALTER TABLE "_studios_v" DROP COLUMN "version_owner_news";
  ALTER TABLE "_studios_v" DROP COLUMN "version_owner_quote";
  ALTER TABLE "_studios_v" DROP COLUMN "version_owner_quote_approved";`)
}
