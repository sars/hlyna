import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_claims_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TABLE "claims" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_claims_status" DEFAULT 'pending' NOT NULL,
  	"reject_reason" varchar,
  	"invite_link" varchar,
  	"studio_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"contact" varchar NOT NULL,
  	"represents" boolean DEFAULT false,
  	"link_to_owner_id" integer,
  	"owner_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "claims_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"studios_id" integer
  );
  
  CREATE TABLE "studio_owners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"login" varchar,
  	"contact" varchar,
  	"active" boolean DEFAULT true,
  	"regenerate_link" boolean DEFAULT false,
  	"invite_link" varchar,
  	"invite_expires" timestamp(3) with time zone,
  	"invite_token_hash" varchar,
  	"password_hash" varchar,
  	"failed_logins" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone,
  	"last_login_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "studio_owners_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"studios_id" integer
  );
  
  ALTER TABLE "studios" ADD COLUMN "owner_verified" boolean DEFAULT false;
  ALTER TABLE "studios" ADD COLUMN "pending_owner_changes" boolean DEFAULT false;
  ALTER TABLE "_studios_v" ADD COLUMN "version_owner_verified" boolean DEFAULT false;
  ALTER TABLE "_studios_v" ADD COLUMN "version_pending_owner_changes" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "claims_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "studio_owners_id" integer;
  ALTER TABLE "claims" ADD CONSTRAINT "claims_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "claims" ADD CONSTRAINT "claims_link_to_owner_id_studio_owners_id_fk" FOREIGN KEY ("link_to_owner_id") REFERENCES "public"."studio_owners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "claims" ADD CONSTRAINT "claims_owner_id_studio_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."studio_owners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "claims_rels" ADD CONSTRAINT "claims_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "claims_rels" ADD CONSTRAINT "claims_rels_studios_fk" FOREIGN KEY ("studios_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "studio_owners_rels" ADD CONSTRAINT "studio_owners_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."studio_owners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "studio_owners_rels" ADD CONSTRAINT "studio_owners_rels_studios_fk" FOREIGN KEY ("studios_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");
  CREATE INDEX "claims_studio_idx" ON "claims" USING btree ("studio_id");
  CREATE INDEX "claims_link_to_owner_idx" ON "claims" USING btree ("link_to_owner_id");
  CREATE INDEX "claims_owner_idx" ON "claims" USING btree ("owner_id");
  CREATE INDEX "claims_updated_at_idx" ON "claims" USING btree ("updated_at");
  CREATE INDEX "claims_created_at_idx" ON "claims" USING btree ("created_at");
  CREATE INDEX "claims_rels_order_idx" ON "claims_rels" USING btree ("order");
  CREATE INDEX "claims_rels_parent_idx" ON "claims_rels" USING btree ("parent_id");
  CREATE INDEX "claims_rels_path_idx" ON "claims_rels" USING btree ("path");
  CREATE INDEX "claims_rels_studios_id_idx" ON "claims_rels" USING btree ("studios_id");
  CREATE UNIQUE INDEX "studio_owners_login_idx" ON "studio_owners" USING btree ("login");
  CREATE INDEX "studio_owners_updated_at_idx" ON "studio_owners" USING btree ("updated_at");
  CREATE INDEX "studio_owners_created_at_idx" ON "studio_owners" USING btree ("created_at");
  CREATE INDEX "studio_owners_rels_order_idx" ON "studio_owners_rels" USING btree ("order");
  CREATE INDEX "studio_owners_rels_parent_idx" ON "studio_owners_rels" USING btree ("parent_id");
  CREATE INDEX "studio_owners_rels_path_idx" ON "studio_owners_rels" USING btree ("path");
  CREATE INDEX "studio_owners_rels_studios_id_idx" ON "studio_owners_rels" USING btree ("studios_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_claims_fk" FOREIGN KEY ("claims_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_studio_owners_fk" FOREIGN KEY ("studio_owners_id") REFERENCES "public"."studio_owners"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "studios_pending_owner_changes_idx" ON "studios" USING btree ("pending_owner_changes");
  CREATE INDEX "_studios_v_version_version_pending_owner_changes_idx" ON "_studios_v" USING btree ("version_pending_owner_changes");
  CREATE INDEX "payload_locked_documents_rels_claims_id_idx" ON "payload_locked_documents_rels" USING btree ("claims_id");
  CREATE INDEX "payload_locked_documents_rels_studio_owners_id_idx" ON "payload_locked_documents_rels" USING btree ("studio_owners_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "claims" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "claims_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "studio_owners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "studio_owners_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "claims" CASCADE;
  DROP TABLE "claims_rels" CASCADE;
  DROP TABLE "studio_owners" CASCADE;
  DROP TABLE "studio_owners_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_claims_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_studio_owners_fk";
  
  DROP INDEX "studios_pending_owner_changes_idx";
  DROP INDEX "_studios_v_version_version_pending_owner_changes_idx";
  DROP INDEX "payload_locked_documents_rels_claims_id_idx";
  DROP INDEX "payload_locked_documents_rels_studio_owners_id_idx";
  ALTER TABLE "studios" DROP COLUMN "owner_verified";
  ALTER TABLE "studios" DROP COLUMN "pending_owner_changes";
  ALTER TABLE "_studios_v" DROP COLUMN "version_owner_verified";
  ALTER TABLE "_studios_v" DROP COLUMN "version_pending_owner_changes";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "claims_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "studio_owners_id";
  DROP TYPE "public"."enum_claims_status";`)
}
