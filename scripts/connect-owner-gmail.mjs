// One-time, loopback-only setup. Never serves the saved credentials.
import http from 'node:http'
import { randomBytes, createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { OAuth2Client } from 'google-auth-library'

const owner = 'peta@kapiki.co.nz'
const clientId = '811771021125-37nptsve9d17qjgecm2kb8rrm387ieeh.apps.googleusercontent.com'
const origin = 'http://localhost:3000'
const callback = `${origin}/kapikiwebsite/oauth-callback`
const setup = randomBytes(32).toString('hex')
let pending
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'")
  const respond = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(text) }
  try {
    if (req.headers.host !== 'localhost:3000') return respond(403, 'Invalid host')
    const url = new URL(req.url, origin)
    if (req.method === 'GET' && url.pathname === '/' && url.searchParams.get('setup') === setup) {
      return respond(200, `<h1>Connect Ka Piki signup notifications</h1><p>Only notifications to ${owner}. No student emails.</p><form method="post" action="/connect"><input type="hidden" name="setup" value="${setup}"><label>Google client secret <input name="secret" type="password" autocomplete="off" required></label><button>Connect Gmail</button></form>`)
    }
    if (req.method === 'POST' && url.pathname === '/connect') {
      if (req.headers.origin !== origin) return respond(403, 'Invalid origin')
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 4096) return respond(413, 'Too large') }
      const form = new URLSearchParams(body)
      const secret = form.get('secret')
      if (form.get('setup') !== setup || !/^GOCSPX-[\w-]+$/.test(secret || '')) return respond(403, 'Invalid setup')
      const client = new OAuth2Client(clientId, secret, callback)
      const state = randomBytes(32).toString('hex')
      const nonce = randomBytes(32).toString('hex')
      const verifier = randomBytes(32).toString('base64url')
      pending = { client, secret, state, nonce, verifier, expires: Date.now() + 600000 }
      const authUrl = client.generateAuthUrl({
        access_type: 'offline', prompt: 'consent', login_hint: owner,
        scope: ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/gmail.send'],
        state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
      })
      res.writeHead(303, { Location: authUrl, 'Set-Cookie': `kp_setup=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/kapikiwebsite/oauth-callback` }); return res.end()
    }
    if (req.method === 'GET' && url.pathname === '/kapikiwebsite/oauth-callback') {
      const flow = pending
      if (!flow || Date.now() > flow.expires || url.searchParams.get('state') !== flow.state || !req.headers.cookie?.split('; ').includes(`kp_setup=${flow.state}`)) return respond(403, 'Invalid or expired connection. Restart setup.')
      pending = null
      if (url.searchParams.has('error') || !url.searchParams.get('code')) return respond(400, 'Google connection was not approved. Restart setup.')
      const { tokens } = await flow.client.getToken({ code: url.searchParams.get('code'), codeVerifier: flow.verifier })
      const ticket = await flow.client.verifyIdToken({ idToken: tokens.id_token, audience: clientId })
      const identity = ticket.getPayload()
      if (identity?.email !== owner || identity.email_verified !== true || identity.nonce !== flow.nonce || !tokens.refresh_token || !tokens.scope?.split(' ').includes('https://www.googleapis.com/auth/gmail.send')) return respond(403, 'The approved owner account and Gmail send permission are required.')
      await mkdir(new URL('../.local/', import.meta.url), { recursive: true, mode: 0o700 })
      await writeFile(new URL('../.local/google-owner.json', import.meta.url), JSON.stringify({ GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: flow.secret, GOOGLE_REFRESH_TOKEN: tokens.refresh_token }), { mode: 0o600, flag: 'wx' })
      console.log('Owner verified; credentials saved privately. No email sent yet.')
      res.setHeader('Set-Cookie', 'kp_setup=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/kapikiwebsite/oauth-callback')
      respond(200, '<h1>Gmail connected</h1><p>Your owner account is verified. No email has been sent yet. You can close this tab.</p>')
      server.close()
      return
    }
    respond(404, 'Not found')
  } catch { console.error('Connection did not complete. No secret details logged.'); respond(500, 'Connection did not complete. Please restart setup.') }
})
server.listen(3000, '127.0.0.1', () => console.log(`${origin}/?setup=${setup}`))
