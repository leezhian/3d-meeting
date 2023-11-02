import { defineConfig } from 'vite'
import { join } from 'node:path'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
    }
  },
  plugins: [vue(), UnoCSS()],
})
