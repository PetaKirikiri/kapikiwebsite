import { Readable } from 'node:stream'

const routes = new Set(['/__website_preview_data', '/__website_sentence', '/__connector_shapes', '/__connector_patterns'])

/** Fixed read-only proxy. Never forwards editing requests or arbitrary URLs. */
export function liveApi(upstream, serviceKey = '') {
  const base = new URL(upstream)
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Invalid CONNECTORS_API_URL')
  return async (req, res, next) => {
    const pathname = new URL(req.url, 'http://website.local').pathname
    if (!routes.has(pathname)) {
      if (pathname.startsWith('/__')) { res.writeHead(404); res.end(); return }
      next(); return
    }
    try {
      let body
      if (pathname === '/__website_preview_data') {
        if (req.method !== 'GET') throw new Error('GET required')
      } else {
        if (req.method !== 'POST') throw new Error('POST required')
        // Vercel parses request bodies before invoking Node handlers.
        let raw = req.body == null ? '' : typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
        if (req.body == null) for await (const chunk of req) {
          raw += chunk.toString()
          if (raw.length > 8192) throw new Error('Request too large')
        }
        if (raw.length > 8192) throw new Error('Request too large')
        const input = JSON.parse(raw)
        if (pathname === '/__connector_shapes') {
          if (Object.keys(input).length !== 1 || !Array.isArray(input.shapes) || input.shapes.length) throw new Error('Website is read-only')
          body = JSON.stringify({ shapes: [] })
        } else if (pathname === '/__connector_patterns') {
          if (Object.keys(input).length !== 1 || input.operation !== 'read') throw new Error('Website is read-only')
          body = JSON.stringify({ operation: 'read' })
        } else {
          if (Object.keys(input).length !== 1 || typeof input.textMi !== 'string' || !input.textMi.trim() || input.textMi.length > 2000) throw new Error('Invalid sentence')
          body = JSON.stringify({ textMi: input.textMi })
        }
      }
      const response = await fetch(new URL(pathname, base), {
        method: req.method,
        headers: {
          'content-type': 'application/json',
          ...(serviceKey ? { 'x-course-service-key': serviceKey } : {}),
        },
        body,
        signal: AbortSignal.timeout(60000),
        redirect: 'error',
      })
      if (!(response.headers.get('content-type') ?? '').includes('application/json')) throw new Error('Course service returned an invalid response')
      res.writeHead(response.status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      Readable.fromWeb(response.body).pipe(res)
    } catch (error) {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Course service unavailable' }))
    }
  }
}
