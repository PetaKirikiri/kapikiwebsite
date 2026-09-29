import test from 'node:test'
import assert from 'node:assert/strict'
import { createSignupAdminHandler } from './signup-admin-api.mjs'
async function run({ method = 'GET', fail = false } = {}) {
  const calls = []
  const handler = createSignupAdminHandler({ query: async sql => {
    calls.push(sql)
    if (fail) throw Error('database password must stay private')
    return { rows: [{ id: 'registration', name: 'Sample learner', email: 'learner@example.invalid', selected_level: 3, created_at: '2026-09-29T00:00:00Z' }] }
  } })
  const req = { method, headers: {} }
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, writeHead(status, headers) { this.status = status; Object.assign(this.headers, headers) }, end(body) { this.body = JSON.parse(body) } }
  await handler(req, res)
  return { ...res, calls }
}
test('standalone link loads registrations without a login or token', async () => {
  const r = await run()
  assert.equal(r.status, 200)
  assert.equal(r.calls.length, 1)
  assert.equal(r.body.registrations[0].name, 'Sample learner')
})
test('query includes only MOE signups and excludes learning notes and ratings', async () => {
  const r = await run()
  assert.match(r.calls[0], /select id, name, email, selected_level, created_at\s+from/)
  assert.match(r.calls[0], /where goals like 'MOE ·%'/)
  assert.doesNotMatch(r.calls[0], /self_ratings|kp_signup_admins/)
  assert.match(r.calls[0], /order by created_at desc, id desc/)
})
test('roster responses cannot be cached and request no indexing', async () => {
  const r = await run()
  assert.equal(r.headers['Cache-Control'], 'private, no-store')
  assert.equal(r.headers['X-Robots-Tag'], 'noindex, nofollow')
  assert.equal(r.headers['X-Content-Type-Options'], 'nosniff')
})
test('endpoint remains read-only', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await run({ method })
    assert.equal(r.status, 405)
    assert.equal(r.headers.Allow, 'GET')
    assert.equal(r.calls.length, 0)
  }
})
test('database failures do not disclose connection details', async () => {
  const r = await run({ fail: true })
  assert.equal(r.status, 503)
  assert.equal(r.body.registrations, undefined)
  assert.doesNotMatch(JSON.stringify(r.body), /password/)
})
