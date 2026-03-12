import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    build: {
      target: 'esnext'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      VITE_APP_VERSION: JSON.stringify(pkg.version)
    },
    server: {
      proxy: {
        '/manifest.json': `http://localhost:${env.SERVER_PORT || 4991}`
      }
    }
  };
});
