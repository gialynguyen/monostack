import { million } from 'million/vite-plugin-million';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [million()],
});
