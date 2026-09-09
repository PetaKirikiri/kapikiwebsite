import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { liveApi } from './live-api.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    root: 'website-preview',
    plugins: [react(), tailwindcss(), {
      name: 'read-only-course-api',
      configureServer(server) {
        server.middlewares.use(liveApi(env.CONNECTORS_API_URL || 'http://127.0.0.1:5176'))
      },
    }],
    build: { outDir: '../dist', emptyOutDir: true },
    server: { port: 5180, strictPort: true, fs: { allow: ['..'] } },
  }
})
