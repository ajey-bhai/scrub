import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// For GitHub Pages project site at https://ajey-bhai.github.io/scrub/
// we set base to /scrub/ so assets resolve correctly.
export default defineConfig({
  plugins: [react()],
  base: '/scrub/',
})
