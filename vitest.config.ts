import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    typecheck: {
      enabled: true,
      include: ['test/**/*.test.ts'],
      tsconfig: './test/tsconfig.json',
    },
  },
});
