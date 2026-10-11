import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_requests_status" ADD VALUE 'closed';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'new'::text;
  DROP TYPE "public"."enum_requests_status";
  CREATE TYPE "public"."enum_requests_status" AS ENUM('new', 'forwarded', 'replied', 'deal', 'lost');
  ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."enum_requests_status";
  ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE "public"."enum_requests_status" USING "status"::"public"."enum_requests_status";`)
}
