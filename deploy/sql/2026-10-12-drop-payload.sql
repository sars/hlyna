-- Drop the former Payload CMS tables (schema public) after the move to schema `app` (cutover 2026-10-12).
-- Reviewed list: every table and enum type that existed in `public` on prod on 2026-10-12. Nothing in `app` or
-- `drizzle` references them (checked: no foreign keys or type dependencies from app.* to public.*).
-- Rollback source: /var/backups/hlyna/pre-payload-removal-20261012-012103.dump (pg_dump -Fc of the whole database),
-- restore only the public schema with:  pg_restore -U hlyna -d hlyna -n public <dump>
-- Run:  docker compose exec -T db psql -U hlyna -d hlyna -v ON_ERROR_STOP=1 < deploy/sql/2026-10-12-drop-payload.sql
BEGIN;
DROP TABLE IF EXISTS
  public._studios_v,
  public._studios_v_locales,
  public._studios_v_rels,
  public._studios_v_version_activity_instagram_posts,
  public._studios_v_version_alternate_names,
  public._studios_v_version_b2b_logo_methods,
  public._studios_v_version_formats,
  public._studios_v_version_other_links,
  public._studios_v_version_prices,
  public._studios_v_version_products,
  public._studios_v_version_sales_channels,
  public._studios_v_version_services,
  public._studios_v_version_sources,
  public.cities,
  public.cities_locales,
  public.claims,
  public.claims_rels,
  public.media,
  public.payload_folders,
  public.payload_folders_folder_type,
  public.payload_kv,
  public.payload_locked_documents,
  public.payload_locked_documents_rels,
  public.payload_migrations,
  public.payload_preferences,
  public.payload_preferences_rels,
  public.requests,
  public.requests_rels,
  public.studio_owners,
  public.studio_owners_rels,
  public.studios,
  public.studios_activity_instagram_posts,
  public.studios_alternate_names,
  public.studios_b2b_logo_methods,
  public.studios_formats,
  public.studios_locales,
  public.studios_other_links,
  public.studios_prices,
  public.studios_products,
  public.studios_rels,
  public.studios_sales_channels,
  public.studios_services,
  public.studios_sources,
  public.users,
  public.users_sessions
  CASCADE;
DROP TYPE IF EXISTS
  public."_locales",
  public."enum__studios_v_published_locale",
  public."enum__studios_v_version_confidence",
  public."enum__studios_v_version_status",
  public."enum__studios_v_version_type",
  public."enum_payload_folders_folder_type",
  public."enum_requests_status",
  public."enum_requests_what",
  public."enum_studios_activity_status",
  public."enum_studios_confidence",
  public."enum_studios_status",
  public."enum_studios_type",
  public."enum_studios_formats",
  public."enum__studios_v_version_formats",
  public."enum_studios_geo_precision",
  public."enum__studios_v_version_geo_precision",
  public."enum_claims_status";
-- Anything left in public at this point is unexpected: fail and roll back instead of guessing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public') THEN
    RAISE EXCEPTION 'public still has tables: %', (SELECT string_agg(tablename, ', ') FROM pg_tables WHERE schemaname = 'public');
  END IF;
END $$;
COMMIT;
