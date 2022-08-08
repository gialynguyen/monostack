/// <reference types="vitest" />
/// <reference types="vite/client" />

import reactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
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
    reactPlugin(),
    tsconfigPathsPlugin(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test.setup.ts'],
    mockReset: true,
  },
});
