import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Forks keep process.env / Prisma native engine isolated across unit vs
    // integration files (unit JWT tests mutate NODE_ENV / JWT_SECRET).
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 30000,
    projects: [
      {
        root: '.',
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['./tests/setup.unit.ts'],
          pool: 'forks',
        },
      },
      {
        root: '.',
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['./tests/setup.ts'],
          pool: 'forks',
          // REVIEW_APPROVE gateway is a shared DB row; parallel files race enable/disable.
          fileParallelism: false,
          retry: 1,
        },
      },
      {
        root: '.',
        test: {
          name: 'performance',
          include: ['tests/performance/**/*.test.ts'],
          setupFiles: ['./tests/setup.performance.ts'],
          pool: 'forks',
          testTimeout: 120_000,
          hookTimeout: 120_000,
          retry: 1,
        },
      },
    ],
  },
});
