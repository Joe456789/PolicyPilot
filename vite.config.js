import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:8080' },
  },
  // SINGLE=1:打包成單一 JS(給單一檔案的展示版用),3D 棋盤不拆成另一個檔
  build: process.env.SINGLE ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
})
