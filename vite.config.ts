import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function src(path: string) {
  return fileURLToPath(new URL(`./src/${path}`, import.meta.url))
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@assets': src('assets'),
      '@constants': src('constants'),
      '@hooks': src('hooks'),
      '@lib': src('lib'),
      '@screens': src('screens'),
      '@components': src('components'),
      '@utils': src('utils'),
      '@translations': src('translations'),
    },
  },
})
