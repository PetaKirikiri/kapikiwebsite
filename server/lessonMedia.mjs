import { cloudflareRealtime } from './cloudflareRealtime.mjs'
const fail = (message, status=400) => Object.assign(new Error(message), { status })
function description(value, type) {
  if (value?.type !== type || typeof value.sdp !== 'string' || value.sdp.length > 100_000 || !value.sdp.startsWith('v=0')) throw fail('Invalid video connection.')
  return { type, sdp: value.sdp }
}
export async function lessonMediaRequest(db, roomId, tokenHash, input, provider = cloudflareRealtime()) {
  const member = (await db.query(`select m.seat, r.closed, r.state->>'kind' as kind
    from classroom_live_member m join classroom_live_room r on r.id=m.room_id
    where m.room_id=$1 and m.token_hash=$2`, [roomId, tokenHash])).rows[0]
  if (!member) throw fail('Join the class first.', 403)
  if (member.closed || member.kind !== 'lesson') throw fail('This class is unavailable.', 410)
  if (!provider.configured) throw fail('Class video is not connected yet.', 503)
  const op = input.op
  if (op === 'list') {
    return { publications: (await db.query(`select s.session_id as "sessionId", m.seat, s.tracks
      from classroom_media_session s join classroom_live_member m using(room_id,token_hash)
      where s.room_id=$1 and s.publisher and not s.closed and s.last_seen>now()-interval '45 seconds'
      and s.token_hash<>$2`, [roomId, tokenHash])).rows }
  }
  if (op === 'publish' || op === 'subscribe') {
    const recent = (await db.query(`select count(*)::int as n from classroom_media_session
      where room_id=$1 and token_hash=$2 and created_at>now()-interval '1 minute'`, [roomId, tokenHash])).rows[0].n
    if (recent >= 40) throw fail('Too many connection attempts. Wait a minute.', 429)
    let tracks, sdp
    if (op === 'publish') {
      sdp = description(input.sessionDescription, 'offer')
      if (!Array.isArray(input.tracks) || input.tracks.length < 1 || input.tracks.length > 2 || input.tracks.some(t => !['camera','microphone'].includes(t.trackName) || !/^\d{1,3}$/.test(t.mid))) throw fail('Invalid media tracks.')
      if (new Set(input.tracks.map(t=>t.trackName)).size !== input.tracks.length) throw fail('Duplicate media tracks.')
      tracks = input.tracks.map(t => ({ location: 'local', mid: t.mid, trackName: t.trackName }))
    } else {
      const publisher = (await db.query(`select session_id,tracks from classroom_media_session
        where session_id=$1 and room_id=$2 and publisher and not closed and last_seen>now()-interval '45 seconds'`, [input.publisherId, roomId])).rows[0]
      if (!publisher?.tracks.length) throw fail('This camera has disconnected.', 404)
      tracks = publisher.tracks.map(t => ({ location: 'remote', sessionId: publisher.session_id, trackName: t.trackName }))
    }
    const { sessionId } = await provider.request(null, 'create')
    if (typeof sessionId !== 'string') throw fail('Video connection failed.', 502)
    await db.query(`insert into classroom_media_session(session_id,room_id,token_hash,publisher)
      values($1,$2,$3,$4)`, [sessionId, roomId, tokenHash, op==='publish'])
    const result = await provider.request(sessionId, 'tracks', { tracks, ...(sdp ? { sessionDescription: sdp } : {}) })
    if (!result.sessionDescription || !Array.isArray(result.tracks) || result.tracks.length!==tracks.length || result.tracks.some(t => t.errorCode)) {
      await db.query('update classroom_media_session set closed=true where session_id=$1',[sessionId])
      await provider.request(sessionId,'close',{force:true,tracks:(result.tracks??[]).filter(t=>t.mid).map(t=>({mid:t.mid}))}).catch(()=>{})
      throw fail('Video connection failed. Rejoin the call.',502)
    }
    await db.query('update classroom_media_session set tracks=$2::jsonb where session_id=$1', [sessionId, JSON.stringify(result.tracks)])
    return { sessionId, sessionDescription: result.sessionDescription, tracks: result.tracks }
  }
  const session = (await db.query(`select * from classroom_media_session where session_id=$1
    and room_id=$2 and token_hash=$3 and not closed`, [input.sessionId, roomId, tokenHash])).rows[0]
  if (!session) throw fail('Rejoin the call.', 403)
  if (op === 'heartbeat') {
    await db.query('update classroom_media_session set last_seen=now() where session_id=$1',[session.session_id])
    return { ok: true }
  }
  if (op === 'answer') return provider.request(session.session_id, 'answer', { sessionDescription: description(input.sessionDescription,'answer') })
  if (op === 'leave') {
    await db.query('update classroom_media_session set closed=true where session_id=$1',[session.session_id])
    await provider.request(session.session_id,'close',{ force:true, tracks:session.tracks.filter(t=>t.mid).map(t=>({mid:t.mid})) })
    return { ok:true }
  }
  throw fail('Unknown video action.')
}
