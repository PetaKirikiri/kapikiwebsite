import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { liveApi } from './live-api.mjs'
import { signupAdminApi } from './signup-admin-api.mjs'
import { trainingApi } from './training-api.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    root: 'website-preview',
    define: { 'import.meta.env.VITE_DB_ONLY': JSON.stringify('true'), 'import.meta.env.VITE_COURSE_INTEREST_ENDPOINT': JSON.stringify('/__course_interest') },
    plugins: [react(), tailwindcss(), {
      name: 'read-only-course-api',
      configureServer(server) {
        Object.assign(process.env, env)
        for (const route of ['__course_curriculum', '__course_lesson', '__course_answer']) server.middlewares.use('/' + route, (req, res) => {
          const url = new URL(req.url, 'http://local'); url.searchParams.set('route', route); req.url = url.pathname + url.search; void trainingApi(req, res)
        })
        server.middlewares.use('/__word_support', (req, res) => {
          const url = new URL(req.url, 'http://local')
          url.searchParams.set('route', '__word_support')
          req.url = url.pathname + url.search
          void trainingApi(req, res)
        })
        server.middlewares.use('/__signup_admin', (req, res) => { void signupAdminApi(req, res) })
        server.middlewares.use(liveApi(env.CONNECTORS_API_URL || 'http://127.0.0.1:5176'))
      },
    }],
    build: { outDir: '../dist', emptyOutDir: true, rollupOptions: { input: { accountSetup: resolve('website-preview/account-setup.html'), main: resolve('website-preview/index.html'), admin: resolve('website-preview/admin.html'), octoberIntakeV1: resolve('website-preview/october-intake-v1.html'), octoberIntakeV2: resolve('website-preview/october-intake-v2.html'), storyReview: resolve('website-preview/story-review.html'), curriculumReview: resolve('website-preview/curriculum-review.html'), translationSheets: resolve('website-preview/translation-sheets.html'), vocabularyTimeline: resolve('website-preview/vocabulary-timeline.html') } } },
    server: { port: 5180, strictPort: true, fs: { allow: ['..'] } },
  }
})
