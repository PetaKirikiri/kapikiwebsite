import { liveApi } from '../live-api.mjs'

const allowed = new Set(['__website_preview_data', '__website_sentence', '__connector_shapes', '__connector_patterns'])

export default async function handler(req, res) {
  const route = new URL(req.url, 'https://website.local').searchParams.get('route')
  if (!allowed.has(route)) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unknown course route' }))
    return
  }
  const upstream = process.env.CONNECTORS_API_URL
  const serviceKey = process.env.COURSE_SERVICE_KEY
  if (!upstream || !serviceKey) {
    console.error('[course-api] Private course service configuration is missing')
    res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ error: 'The live course service is not configured yet.' }))
    return
  }
  try {
    req.url = `/${route}`
    await liveApi(upstream, serviceKey)(req, res, () => { res.writeHead(404); res.end() })
  } catch {
    console.error('[course-api] Invalid live course configuration')
    res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ error: 'The live course service is unavailable.' }))
  }
}
