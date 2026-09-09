import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { liveApi } from './live-api.mjs'
import handler from './api/course.js'

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

test('Vercel adapter forwards parsed POST bodies and reports missing configuration', async () => {
  const previous = process.env.CONNECTORS_API_URL
  const previousKey = process.env.COURSE_SERVICE_KEY
  const upstream = createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ path: req.url, body: JSON.parse(raw), key: req.headers['x-course-service-key'] }))
  })
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const website = createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (raw) req.body = JSON.parse(raw)
    await handler(req, res)
  })
  await new Promise(resolve => website.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${website.address().port}`
  try {
    delete process.env.CONNECTORS_API_URL
    assert.equal((await fetch(base + '/api/course?route=__website_preview_data')).status, 503)
    process.env.CONNECTORS_API_URL = `http://127.0.0.1:${upstream.address().port}`
    process.env.COURSE_SERVICE_KEY = 'test-service-key'
    const response = await fetch(base + '/api/course?route=__connector_patterns', { method: 'POST', body: JSON.stringify({ operation: 'read' }) })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { path: '/__connector_patterns', body: { operation: 'read' }, key: 'test-service-key' })
    assert.equal((await fetch(base + '/api/course?route=__bus_manifest')).status, 404)
  } finally {
    if (previous == null) delete process.env.CONNECTORS_API_URL
    else process.env.CONNECTORS_API_URL = previous
    if (previousKey == null) delete process.env.COURSE_SERVICE_KEY
    else process.env.COURSE_SERVICE_KEY = previousKey
    await Promise.all([new Promise(resolve => website.close(resolve)), new Promise(resolve => upstream.close(resolve))])
  }
})
