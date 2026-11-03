import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
  },
  build: {
    rolldownOptions: {
      output: {
        // Keep the whole 3D stack in its own chunk, reached only through the
        // lazily loaded scenes. Without this, rolldown merges three.js into a
        // shared chunk together with small helpers (zustand) that the eager
        // section components import, so three ends up on the critical path.
        codeSplitting: {
          groups: [
            {
              // Vite's dynamic-import helper; otherwise it lands in whichever
              // chunk rolldown picks first — here, the 3D one.
              name: 'preload-helper',
              test: /preload-helper/,
              priority: 40,
            },
            {
              // React is shared by everything; without its own group it gets
              // folded into the 3D chunk and drags that onto the critical path.
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)[\\/]/,
              priority: 30,
            },
            {
              // Tiny state libs shared by eager DOM code and the 3D scenes.
              name: 'state',
              test: /node_modules[\\/](zustand|use-sync-external-store)[\\/]/,
              priority: 20,
            },
            {
              name: 'three-stack',
              priority: 10,
              test: /node_modules[\\/](three|three-stdlib|three-mesh-bvh|@react-three|postprocessing|n8ao|maath|meshline|troika-[^\\/]+|@dimforge|camera-controls|@monogrid|detect-gpu|stats-gl|stats\.js|hls\.js|@mediapipe)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
