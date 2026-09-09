import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Bundles the entire app into a single index.html (JS + CSS inlined, no
// external assets). Meant for testers: they can open the file directly by
// double-clicking / tapping it, on a laptop or a phone, with no local
// server and no install steps.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: 'dist-offline',
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
  },
})
