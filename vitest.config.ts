import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Tests travel with their slice, so they are discovered under slices/ too.
    include: ['{app,components,lib,slices}/**/*.{test,spec}.{ts,tsx}'],
  },
});
