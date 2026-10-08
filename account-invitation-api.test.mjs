import { afterEach, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { createAccountInvitationHandler } from './account-invitation-api.mjs'

const servers = []
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve)))) })
async function fixture({ valid = true, claim = true, active = true, mismatch = false } = {}) {
  const invitation = { id: 'invitation-id', user_id: 'user-id', email: 'learner@example.com' }
  const query = vi.fn().mockResolvedValueOnce({ rows: valid ? [invitation] : [] })
    .mockResolvedValueOnce({ rows: claim ? [{ id: invitation.id }] : [] })
    .mockResolvedValueOnce({ rows: active ? [{ id: invitation.id }] : [] })
  const generateLink = vi.fn().mockResolvedValue({ data: { user: { id: mismatch ? 'other-user' : invitation.user_id, email: invitation.email }, properties: { hashed_token: 'short-lived-token' } } })
  const server = createServer(createAccountInvitationHandler({ query, generateLink, allowedOrigin: 'https://kapikiwebsite.vercel.app' }))
  servers.push(server)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  const request = (body, extra = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) })
  return { request, query, generateLink, invitation, url }
}
const token = 'a'.repeat(64)
it('accepts only the invitation token and returns an uncached short-lived credential', async () => {
  const f = await fixture()
  const response = await f.request({ token })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(await response.json()).toEqual({ tokenHash: 'short-lived-token', type: 'magiclink' })
  expect(f.query.mock.calls[0][1]).toEqual([createHash('sha256').update(token).digest('hex')])
  expect(f.generateLink).toHaveBeenCalledExactlyOnceWith({ type: 'magiclink', email: f.invitation.email })
})
it.each([{ token, email: 'someone-else@example.com' }, { token: 'invalid' }, { token, password: 'unwanted' }])('rejects extra identity/password fields or invalid tokens before contacting Auth', async body => {
  const f = await fixture(); expect((await f.request(body)).status).toBe(400)
  expect(f.query).not.toHaveBeenCalled(); expect(f.generateLink).not.toHaveBeenCalled()
})
it.each([
  [{ valid: false }, 400], [{ claim: false }, 429], [{ active: false }, 400], [{ mismatch: true }, 503],
])('does not return a credential when invitation validation fails: %o', async (options, status) => {
  const f = await fixture(options); const response = await f.request({ token })
  expect(response.status).toBe(status); expect(await response.text()).not.toContain('short-lived-token')
  if (options.valid === false || options.claim === false) expect(f.generateLink).not.toHaveBeenCalled()
})
it('rejects GET, cross-site requests and oversized bodies before querying', async () => {
  const f = await fixture()
  expect((await fetch(f.url)).status).toBe(405)
  expect((await f.request({ token }, { Origin: 'https://other.example' })).status).toBe(403)
  expect((await f.request({ token }, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
  expect((await f.request({ token: 'a'.repeat(2048) })).status).toBe(413)
  expect(f.query).not.toHaveBeenCalled(); expect(f.generateLink).not.toHaveBeenCalled()
})
