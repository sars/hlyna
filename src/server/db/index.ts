import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

// One pool per process. Scripts pass their own connection string through DATABASE_URL.
const globalForDb = globalThis as unknown as { hlynaPool?: Pool }

export const pool =
  globalForDb.hlynaPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX ?? 10) })
if (process.env.NODE_ENV !== 'production') globalForDb.hlynaPool = pool

export const db = drizzle(pool, { schema, casing: 'snake_case' })
export type Db = typeof db
export { schema }
