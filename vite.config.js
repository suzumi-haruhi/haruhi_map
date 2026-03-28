import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    watch: {
      ignored: (file) => {
        const f = file.replace(/\\/g, '/')
        return /\/server\/(data|uploads)\//.test(f) || /\.sqlite/.test(f)
      }
    },
    proxy: {
      '/api': {
        target: 'http://localhost:15555',
        changeOrigin: true
      }
    }
  }
})
