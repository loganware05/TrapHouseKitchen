import { defineConfig } from 'vitest/config';

/** Isolated config so `npm run test:performance` does not depend on `--project` (unreliable with inline projects in Vitest 1.x). */
export default defineConfig({
  test: {
    name: 'performance',
    globals: true,
    environment: 'node',
    include: ['tests/performance/**/*.test.ts'],
    setupFiles: ['./tests/setup.performance.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    retry: 1,
  },
});
