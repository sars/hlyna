import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Integration tests against a real Postgres (default database hlyna_apptest, see each spec); they share it, so no
// file parallelism. Nothing renders React, so the environment is plain Node.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    fileParallelism: false,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
  },
})
