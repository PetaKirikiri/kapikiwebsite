import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { liveApi } from './live-api.mjs'
import { signupAdminApi } from './signup-admin-api.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    root: 'website-preview',
    define: { 'import.meta.env.VITE_DB_ONLY': JSON.stringify('true'), 'import.meta.env.VITE_COURSE_INTEREST_ENDPOINT': JSON.stringify('/__course_interest') },
    plugins: [react(), tailwindcss(), {
      name: 'read-only-course-api',
      configureServer(server) {
        Object.assign(process.env, env)
        server.middlewares.use('/__signup_admin', (req, res) => { void signupAdminApi(req, res) })
        server.middlewares.use(liveApi(env.CONNECTORS_API_URL || 'http://127.0.0.1:5176'))
      },
    }],
    build: { outDir: '../dist', emptyOutDir: true, rollupOptions: { input: { main: resolve('website-preview/index.html'), admin: resolve('website-preview/admin.html'), octoberIntakeV1: resolve('website-preview/october-intake-v1.html'), octoberIntakeV2: resolve('website-preview/october-intake-v2.html') } } },
    server: { port: 5180, strictPort: true, fs: { allow: ['..'] } },
  }
})
