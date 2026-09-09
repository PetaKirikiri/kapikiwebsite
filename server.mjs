import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { liveApi } from './live-api.mjs'

if (!process.env.CONNECTORS_API_URL) throw new Error('Set CONNECTORS_API_URL to the running Connectors course service.')
const api = liveApi(process.env.CONNECTORS_API_URL)
const root = fileURLToPath(new URL('./dist/', import.meta.url))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
const server = createServer((req, res) => {
  void api(req, res, async () => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
      const pathname = decodeURIComponent(new URL(req.url, 'http://website.local').pathname)
      const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
      if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return }
      const content = await readFile(file)
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' })
      res.end(req.method === 'HEAD' ? undefined : content)
    } catch { res.writeHead(404); res.end('Not found') }
  })
})
server.listen(Number(process.env.PORT || 5180), '0.0.0.0', () => console.log('Ka Piki website ready'))
