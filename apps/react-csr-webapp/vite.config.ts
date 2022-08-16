/// <reference types="vitest" />
/// <reference types="vite/client" />

import reactPlugin from '@vitejs/plugin-react';
import { defineConfig, UserConfigExport } from 'vite';
import tsconfigPathsPlugin from 'vite-tsconfig-paths';
/*
 * @description Virtual DOM optional
 * */
// import { million } from 'million/vite-plugin-million';

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
