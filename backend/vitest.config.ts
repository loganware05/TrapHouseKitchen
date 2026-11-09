import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Forks keep process.env / Prisma native engine isolated across unit vs
    // integration files (unit JWT tests mutate NODE_ENV / JWT_SECRET).
    pool: 'forks',
    // Projects alone still overlapped integration files in CI (coupon gateway races).
    // Single worker makes shared DB fixtures deterministic across the suite.
    fileParallelism: false,
    maxWorkers: 1,
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
          maxWorkers: 1,
          fileParallelism: false,
        },
      },
      {
        root: '.',
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['./tests/setup.ts'],
          pool: 'forks',
          // REVIEW_APPROVE gateway is a shared DB row; never run these files in parallel.
          maxWorkers: 1,
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
          maxWorkers: 1,
          fileParallelism: false,
          testTimeout: 120_000,
          hookTimeout: 120_000,
          retry: 1,
        },
      },
    ],
  },
});
