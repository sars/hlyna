import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_studios_geo_precision" AS ENUM('address', 'street', 'settlement');
  CREATE TYPE "public"."enum__studios_v_version_geo_precision" AS ENUM('address', 'street', 'settlement');
  ALTER TABLE "studios" ADD COLUMN "geo_lat" numeric;
  ALTER TABLE "studios" ADD COLUMN "geo_lng" numeric;
  ALTER TABLE "studios" ADD COLUMN "geo_precision" "enum_studios_geo_precision";
  ALTER TABLE "studios" ADD COLUMN "geo_geocoded_at" timestamp(3) with time zone;
  ALTER TABLE "studios" ADD COLUMN "geo_source" varchar;
  ALTER TABLE "_studios_v" ADD COLUMN "version_geo_lat" numeric;
  ALTER TABLE "_studios_v" ADD COLUMN "version_geo_lng" numeric;
  ALTER TABLE "_studios_v" ADD COLUMN "version_geo_precision" "enum__studios_v_version_geo_precision";
  ALTER TABLE "_studios_v" ADD COLUMN "version_geo_geocoded_at" timestamp(3) with time zone;
  ALTER TABLE "_studios_v" ADD COLUMN "version_geo_source" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "studios" DROP COLUMN "geo_lat";
  ALTER TABLE "studios" DROP COLUMN "geo_lng";
  ALTER TABLE "studios" DROP COLUMN "geo_precision";
  ALTER TABLE "studios" DROP COLUMN "geo_geocoded_at";
  ALTER TABLE "studios" DROP COLUMN "geo_source";
  ALTER TABLE "_studios_v" DROP COLUMN "version_geo_lat";
  ALTER TABLE "_studios_v" DROP COLUMN "version_geo_lng";
  ALTER TABLE "_studios_v" DROP COLUMN "version_geo_precision";
  ALTER TABLE "_studios_v" DROP COLUMN "version_geo_geocoded_at";
  ALTER TABLE "_studios_v" DROP COLUMN "version_geo_source";
  DROP TYPE "public"."enum_studios_geo_precision";
  DROP TYPE "public"."enum__studios_v_version_geo_precision";`)
}
