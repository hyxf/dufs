import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    publicDir: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    },
    server: {
      proxy: {
        '/__dufs_dev': {
          target: env.VITE_DUFS_BACKEND || 'http://127.0.0.1:5001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__dufs_dev/, ''),
        },
      },
    },
    build: {
      outDir: '../assets-react',
      emptyOutDir: true,
      lib: {
        entry: 'src/main.tsx',
        name: 'DufsFrontend',
        formats: ['iife'],
        fileName: () => 'index.js',
        cssFileName: 'index',
      },
      rollupOptions: {
        output: {
          assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'index.css' : 'assets/[name][extname]',
        },
      },
    },
  }
})
