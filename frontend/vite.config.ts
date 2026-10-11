import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://132.243.17.175', // Твой бэкенд
        changeOrigin: true,
        secure: false,
      }
    }
  }
})