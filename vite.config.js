import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/MAIA/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-d3': ['d3', 'd3-geo', 'topojson-client'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/postprocessing', 'postprocessing'],
          'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-task-list', '@tiptap/extension-task-item', '@tiptap/extension-highlight', '@tiptap/extension-link', 'tiptap-markdown'],
          'vendor-ui': ['@radix-ui/react-popover', '@radix-ui/react-context-menu', 'framer-motion', 'lucide-react']
        },
        // Ensure unique hashes on every build for proper cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
