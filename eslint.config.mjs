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

export default eslintConfig
