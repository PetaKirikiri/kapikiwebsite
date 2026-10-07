const API = 'https://rtc.live.cloudflare.com/v1/apps'
const failure = (message, status) => Object.assign(new Error(message), { status })

// Server only. Room membership and session ownership must be checked by the caller.
export function cloudflareRealtime({ env = process.env, fetcher = fetch } = {}) {
  const appId = env.CLOUDFLARE_REALTIME_APP_ID
  const secret = env.CLOUDFLARE_REALTIME_APP_SECRET
  async function request(sessionId, operation, body) {
    if (!appId || !secret) throw failure('Class video is not connected yet.', 503)
    if (!/^[a-zA-Z0-9_-]+$/.test(appId)) throw failure('Class video configuration is invalid.', 503)
    const operations = {
      create: ['POST', 'sessions/new'],
      tracks: ['POST', `sessions/${sessionId}/tracks/new`],
      answer: ['PUT', `sessions/${sessionId}/renegotiate`],
      close: ['PUT', `sessions/${sessionId}/tracks/close`],
      inspect: ['GET', `sessions/${sessionId}`],
    }
    if (!Object.hasOwn(operations, operation) || (operation !== 'create' && !/^[a-zA-Z0-9_-]{1,200}$/.test(sessionId ?? ''))) {
      throw failure('Invalid video request.', 400)
    }
    const [method, path] = operations[operation]
    let response
    try {
      response = await fetcher(`${API}/${appId}/${path}`, {
        method,
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(12_000),
      })
    } catch {
      throw failure('Video connection timed out. Rejoin the call.', 502)
    }
    // Never forward provider errors, which may contain credentials or private SDP.
    if (!response.ok) throw failure('Video connection failed. Rejoin the call.', 502)
    let result
    try { result = await response.json() } catch { throw failure('Video connection failed. Rejoin the call.', 502) }
    if (!result || typeof result !== 'object' || result.errorCode) throw failure('Video connection failed. Rejoin the call.', 502)
    return result
  }
  return { configured: Boolean(appId && secret), request }
}
