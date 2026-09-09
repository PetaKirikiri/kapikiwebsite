import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { liveApi } from './live-api.mjs'

test('forwards course reads and rejects all writes and unknown routes', async () => {
  let calls = 0
  const upstream = createServer((req, res) => {
    calls++
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ path: req.url }))
  })
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const proxy = liveApi(`http://127.0.0.1:${upstream.address().port}`)
  const website = createServer((req, res) => void proxy(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise(resolve => website.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${website.address().port}`
  try {
    assert.equal((await fetch(base + '/__website_preview_data')).status, 200)
    for (const [route, body] of [
      ['/__connector_shapes', { shapes: [] }],
      ['/__connector_patterns', { operation: 'read' }],
      ['/__website_sentence', { textMi: 'Ko Charlie te manu' }],
    ]) assert.equal((await fetch(base + route, { method: 'POST', body: JSON.stringify(body) })).status, 200)
    assert.equal(calls, 4)
    for (const [route, body] of [
      ['/__connector_shapes', { shapes: [{ id: 1 }] }],
      ['/__connector_patterns', { operation: 'save' }],
      ['/__bus_manifest', { operation: 'submit-bus-manifest' }],
      ['/__website_sentence', { textMi: 'hello', operation: 'save' }],
    ]) assert.ok((await fetch(base + route, { method: 'POST', body: JSON.stringify(body) })).status >= 400)
    assert.equal(calls, 4)
  } finally {
    await Promise.all([new Promise(resolve => website.close(resolve)), new Promise(resolve => upstream.close(resolve))])
  }
})
