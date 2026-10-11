import { defineConfig } from 'drizzle-kit'

// Our tables live in Postgres schema `app`; Payload's `public` tables are invisible to drizzle-kit.
// Generated SQL goes to drizzle/ and is reviewed and committed; applied migrations are never edited.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  schemaFilter: ['app'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost/hlyna' },
  strict: true,
  verbose: true,
})
