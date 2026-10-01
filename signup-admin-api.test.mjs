import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createSignupAdminHandler } from './signup-admin-api.mjs'
async function run({ method = 'GET', fail = false, body, headers = {}, url = '/', found = true, stream = false } = {}) {
  const calls = []
  const handler = createSignupAdminHandler({ query: async (sql, values) => {
    calls.push({ sql, values })
    if (fail) throw Error('database password must stay private')
    return { rows: !found ? [] : [{ id: 'registration', name: 'Sample learner', email: 'learner@example.invalid', selected_level: 3, created_at: '2026-09-29T00:00:00Z' }] }
  } })
  const req = Object.assign(stream ? Readable.from([JSON.stringify(body)]) : {}, { method, headers: { host: 'example.com', 'content-type': 'application/json', ...headers }, url, ...(stream ? {} : { body }) })
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
  assert.match(r.calls[0].sql, /select id, name, email, selected_level, created_at, department_group\s+from/)
  assert.match(r.calls[0].sql, /where goals like 'MOE ·%'/)
  assert.doesNotMatch(r.calls[0].sql, /self_ratings|kp_signup_admins/)
  assert.match(r.calls[0].sql, /order by created_at desc, id desc/)
})
test('roster responses cannot be cached and request no indexing', async () => {
  const r = await run()
  assert.equal(r.headers['Cache-Control'], 'private, no-store')
  assert.equal(r.headers['X-Robots-Tag'], 'noindex, nofollow')
  assert.equal(r.headers['X-Content-Type-Options'], 'nosniff')
})
test('unsupported methods do not change registrations', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const r = await run({ method })
    assert.equal(r.status, 405)
    assert.equal(r.headers.Allow, 'GET, PATCH')
    assert.equal(r.calls.length, 0)
  }
})
test('database failures do not disclose connection details', async () => {
  const r = await run({ fail: true })
  assert.equal(r.status, 503)
  assert.equal(r.body.registrations, undefined)
  assert.doesNotMatch(JSON.stringify(r.body), /password/)
})

const id = '22222222-2222-4222-8222-222222222222'
test('active and removed lists are separate', async () => {
  assert.match((await run()).calls[0].sql, /removed_at is null/)
  assert.match((await run({ url: '/?removed=true' })).calls[0].sql, /removed_at is not null/)
})
test('remove and restore only the exact MOE registration, retaining its data', async () => {
  for (const action of ['remove', 'restore']) {
    const r = await run({ method: 'PATCH', body: { id, action }, stream: action === 'remove' })
    assert.equal(r.status, 200)
    assert.equal(r.body.saved, true)
    assert.deepEqual(r.calls[0].values, [id])
    assert.match(r.calls[0].sql, /where id = \$1::uuid and goals like 'MOE ·%'/)
    assert.match(r.calls[0].sql, action === 'remove' ? /coalesce\(removed_at, now\(\)\)/ : /removed_at = null/)
    assert.doesNotMatch(r.calls[0].sql, /delete from|set email|set selected_level/)
  }
})
test('reject invalid actions and IDs before querying', async () => {
  for (const body of [{ id, action: 'delete' }, { id: 'bad', action: 'remove' }, null]) {
    const r = await run({ method: 'PATCH', body })
    assert.equal(r.status, 400); assert.equal(r.calls.length, 0)
  }
})
test('reject cross-site removal and non-JSON requests', async () => {
  for (const headers of [{ origin: 'https://attacker.example' }, { 'sec-fetch-site': 'cross-site' }, { origin: 'invalid' }, { 'content-type': 'text/plain' }]) {
    const r = await run({ method: 'PATCH', headers, body: { id, action: 'remove' } })
    assert.ok([403, 415].includes(r.status)); assert.equal(r.calls.length, 0)
  }
})
test('missing records and write failures are not reported as success', async () => {
  assert.equal((await run({ method: 'PATCH', body: { id, action: 'remove' }, found: false })).status, 404)
  const r = await run({ method: 'PATCH', body: { id, action: 'remove' }, fail: true })
  assert.equal(r.status, 503); assert.doesNotMatch(JSON.stringify(r.body), /password/)
})
test('moves only an active MOE signup at the expected level and rejects duplicates', async () => {
  const r = await run({ method: 'PATCH', body: { id, action: 'move', fromLevel: 2, level: 3 } })
  assert.equal(r.status, 200)
  assert.equal(r.body.registration.selected_level, 3)
  assert.deepEqual(r.calls[0].values, [id, 3, 2])
  assert.match(r.calls[0].sql, /signup\.selected_level = \$3/)
  assert.match(r.calls[0].sql, /signup\.removed_at is null/)
  assert.match(r.calls[0].sql, /not exists/)
  assert.match(r.calls[0].sql, /lower\(trim\(other.email\)\)/)
  assert.doesNotMatch(r.calls[0].sql, /set email|set created_at|delete from/)
  assert.equal((await run({ method: 'PATCH', body: { id, action: 'move', fromLevel: 2, level: 3 }, found: false })).status, 409)
})
test('invalid or unchanged destination levels do not write', async () => {
  for (const level of [0, 7, 2, 2.5, '3', null]) {
    const r = await run({ method: 'PATCH', body: { id, action: 'move', fromLevel: 2, level } })
    assert.equal(r.status, 400); assert.equal(r.calls.length, 0)
  }
  assert.equal((await run({ method: 'PATCH', body: { id, action: 'move', level: 3 } })).status, 400)
})
