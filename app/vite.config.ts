import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serve dưới https://<user>.github.io/product-backlog-crm/
  base: command === 'build' ? '/product-backlog-crm/' : '/',
}))
