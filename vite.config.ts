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
        'extract-pdf-pages': resolve(__dirname, 'extract-pdf-pages/index.html'),
        'delete-pdf-pages': resolve(__dirname, 'delete-pdf-pages/index.html'),
        'reorder-pdf-pages': resolve(__dirname, 'reorder-pdf-pages/index.html'),
        'rotate-pdf': resolve(__dirname, 'rotate-pdf/index.html'),
        'duplicate-pdf-pages': resolve(__dirname, 'duplicate-pdf-pages/index.html'),
        'reverse-pdf': resolve(__dirname, 'reverse-pdf/index.html'),
        'jpg-to-pdf': resolve(__dirname, 'jpg-to-pdf/index.html'),
        'pdf-to-jpg': resolve(__dirname, 'pdf-to-jpg/index.html'),
        'add-page-numbers': resolve(__dirname, 'add-page-numbers/index.html'),
        'watermark-pdf': resolve(__dirname, 'watermark-pdf/index.html'),
        'crop-pdf': resolve(__dirname, 'crop-pdf/index.html'),
        'resize-pdf': resolve(__dirname, 'resize-pdf/index.html'),
        'edit-pdf-metadata': resolve(__dirname, 'edit-pdf-metadata/index.html'),
        'grayscale-pdf': resolve(__dirname, 'grayscale-pdf/index.html'),
        'flatten-pdf': resolve(__dirname, 'flatten-pdf/index.html'),
        'compress-pdf': resolve(__dirname, 'compress-pdf/index.html'),
        'pdf-info': resolve(__dirname, 'pdf-info/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/setup/global-setup.ts'],
  },
});
