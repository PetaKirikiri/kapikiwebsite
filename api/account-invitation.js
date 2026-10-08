import { accountInvitationRuntime } from '../account-invitation-api.mjs'

let runtime
export default async function handler(req, res) {
  try {
    runtime ??= accountInvitationRuntime()
    await runtime.handler(req, res)
  } catch {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' })
    res.end(JSON.stringify({ error: 'Account setup is temporarily unavailable. Please try again shortly.' }))
  }
}
