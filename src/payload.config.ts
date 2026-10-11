import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { en } from '@payloadcms/translations/languages/en'
import { uk } from '@payloadcms/translations/languages/uk'

import { Claims } from './collections/Claims'
import { Cities } from './collections/Cities'
import { Media } from './collections/Media'
import { Requests } from './collections/Requests'
import { StudioOwners } from './collections/StudioOwners'
import { Studios } from './collections/Studios'
import { Users } from './collections/Users'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: ['@/components/admin/OwnerQueue'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Dev: schema is pushed automatically (push defaults to true outside production).
    // Production: pending migrations from src/migrations run on server start.
    // After changing collections: `pnpm payload migrate:create <name>` and commit the files.
    // Migrations run when the production server starts, not during `next build` (the build only reads data).
    prodMigrations: process.env.NEXT_PHASE === 'phase-production-build' ? undefined : migrations,
  }),
  collections: [Studios, Cities, Requests, Claims, StudioOwners, Media, Users],
  i18n: {
    fallbackLanguage: 'uk',
    supportedLanguages: { uk, en },
  },
  // Ukrainian only for now; add { code: 'en', label: 'English' } later to enable English content.
  localization: {
    locales: [{ code: 'uk', label: 'Українська' }],
    defaultLocale: 'uk',
    fallback: true,
  },
  cors: [getServerSideURL()].filter(Boolean),
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
