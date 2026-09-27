/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page static site: each tool gets its own stable URL (spec §19).
export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        'merge-pdf': resolve(__dirname, 'merge-pdf/index.html'),
        'split-pdf': resolve(__dirname, 'split-pdf/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/global-setup.ts'],
  },
});
