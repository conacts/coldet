import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'threads',
    maxWorkers: 2, // Limit to 2 workers to reduce memory usage
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
