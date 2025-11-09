import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/renderer/features'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@domain': path.resolve(__dirname, './src/domain'),
      '@shared': path.resolve(__dirname, './src/renderer/shared')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  server: {
    port: 5174  // Use different port from main game (5173)
  }
});
