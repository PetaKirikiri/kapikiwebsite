import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cloudflareRealtime } from './cloudflareRealtime.mjs'

const env = { CLOUDFLARE_REALTIME_APP_ID: 'app-test', CLOUDFLARE_REALTIME_APP_SECRET: 'private-test-secret' }
test('missing configuration fails without making a network call', async () => {
  const client = cloudflareRealtime({ env: {}, fetcher: () => assert.fail('must not fetch') })
  assert.equal(client.configured, false)
  await assert.rejects(client.request(null, 'create'), { status: 503 })
})
test('only fixed SFU routes and valid session identifiers can be requested', async () => {
  const client = cloudflareRealtime({ env, fetcher: () => assert.fail('must not fetch') })
  await assert.rejects(client.request('../another-app', 'tracks', {}), { status: 400 })
  await assert.rejects(client.request('session', 'delete-account', {}), { status: 400 })
})
test('credentials stay in backend headers and creation has no invented region', async () => {
  const client = cloudflareRealtime({ env, fetcher: async (url, options) => {
    assert.equal(url, 'https://rtc.live.cloudflare.com/v1/apps/app-test/sessions/new')
    assert.equal(options.headers.Authorization, 'Bearer private-test-secret')
    assert.equal(options.body, undefined)
    return { ok: true, json: async () => ({ sessionId: 'session' }) }
  } })
  assert.deepEqual(await client.request(null, 'create'), { sessionId: 'session' })
})
test('provider failures cannot leak private response content', async () => {
  for (const response of [
    { ok: false, json: async () => ({ error: env.CLOUDFLARE_REALTIME_APP_SECRET }) },
    { ok: true, json: async () => ({ errorCode: 'secret-detail' }) },
    { ok: true, json: async () => { throw new Error('private-response') } },
  ]) {
    const client = cloudflareRealtime({ env, fetcher: async () => response })
    await assert.rejects(client.request(null, 'create'), error => error.status === 502 && !/secret|private/.test(error.message))
  }
})
