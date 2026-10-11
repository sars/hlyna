import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// Next 16 ships native flat configs; FlatCompat on top of them crashes with
// "Converting circular structure to JSON".
// The react-hooks plugin object as registered by eslint-config-next (not hoisted by pnpm).
const reactHooks = nextCoreWebVitals.find((c) => c.plugins?.['react-hooks'])?.plugins['react-hooks']

const eslintConfig = [
  {
    ignores: [
      '.next/',
      'node_modules/',
      'public/',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
      'src/migrations/',
      'src/app/(payload)/admin/importMap.js',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // React Compiler advisories (eslint-plugin-react-hooks 7): hints, not bugs, for now.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
]

// Public pages ship no auth or panel JavaScript: the site and its components may not import client auth,
// the panel UI, or server-only auth/db modules (server components reach data through src/lib).
eslintConfig.push({
  files: ['src/app/(frontend)/**', 'src/components/site/**'],
  ignores: ['src/app/(frontend)/kabinet/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: ['better-auth/react', 'better-auth/client', 'better-auth/client/*'], message: 'No auth client JS on public pages.' },
          { group: ['**/components/panel/**', '@/components/panel/**'], message: 'Panel UI must not be imported by public pages.' },
          { group: ['**/server/auth/**', '@/server/auth/**'], message: 'Auth lives on the server and in /kabinet, /panel only.' },
          { group: ['@tanstack/*', '@base-ui/*', 'sonner', 'hono', 'hono/*'], message: 'Panel and API libraries stay out of public pages.' },
        ],
      },
    ],
  },
})

// The panel's UI talks to the server only through /api/panel and server components: client components under
// components/panel may not import the server layer directly (it would leak into the browser bundle or fail).
eslintConfig.push({
  files: ['src/components/panel/ui/**', 'src/components/panel/inhouse/**', 'src/components/panel/shell/**', 'src/components/panel/lib/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [{ group: ['@/server/db', '@/server/db/**', '@/server/services/**', '@/server/api/**'], message: 'Client UI reaches data through /api/panel.' }] },
    ],
  },
})

export default eslintConfig
