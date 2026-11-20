import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'electron-vite';
import path from 'path';

export default defineConfig({
  main: {
    build: {
      minify: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/main/bootstrap.ts'),
          app: path.resolve(__dirname, 'src/main/index.ts')
        },
        // a native addon that finds its prebuilt binary relative to its own package folder
        external: ['@vencord/venmic'],
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/preload/index.ts'),
          'server-view': path.resolve(__dirname, 'src/preload/server-view.ts'),
          performance: path.resolve(__dirname, 'src/preload/performance.ts')
        },
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  renderer: {
    build: {
      minify: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/renderer/index.html'),
          performance: path.resolve(__dirname, 'src/renderer/performance.html')
        }
      }
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, '../../packages/ui/src') }
    },
    server: { port: 5180, strictPort: true }
  }
});
