import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Playwright owns tests/e2e; Vitest must not try to run those.
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    clearMocks: true,
    restoreMocks: true,
  },
});
