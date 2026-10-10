import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded using relative paths in Electron file:// protocol
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4001'
    }
  }
});
