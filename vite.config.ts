import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When building for GitLab Pages the repo name becomes the URL sub-path:
// https://<namespace>.pages.cee.redhat.com/RHESS/
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
