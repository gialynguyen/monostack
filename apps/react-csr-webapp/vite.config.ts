/// <reference types="vitest" />
/// <reference types="vite/client" />

import reactPlugin from '@vitejs/plugin-react';
/*
 * @description Virtual DOM optional
 * */
// import { million } from 'million/vite-plugin-million';
import type { UserConfigExport } from 'vite';
import { defineConfig } from 'vite';
import tsconfigPathsPlugin from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // million({
    //   react: true,
    // }),
    tsconfigPathsPlugin(),
    reactPlugin(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test.setup.ts'],
    mockReset: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
} as UserConfigExport);
