import * as Y from 'yjs'

const MAX_BOARD_BYTES = 2_000_000
const invalid = message => Object.assign(new Error(message), { status: 400 })
function decode(value, max = MAX_BOARD_BYTES) {
  if (typeof value !== 'string' || value.length > max * 1.34 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw invalid('Invalid whiteboard update.')
  return new Uint8Array(Buffer.from(value, 'base64'))
}

// Called only after classroom membership is checked.
export function syncLessonWhiteboard(saved, input) {
  const doc = new Y.Doc()
  try {
    if (saved) Y.applyUpdate(doc, decode(saved))
    if (input.update) Y.applyUpdate(doc, decode(input.update))
    const snapshot = Y.encodeStateAsUpdate(doc)
    if (snapshot.length > MAX_BOARD_BYTES) throw invalid('This board is full. Start a new lesson board.')
    const vector = input.vector ? decode(input.vector, 64_000) : undefined
    const update = Y.encodeStateAsUpdate(doc, vector)
    return {
      saved: Buffer.from(snapshot).toString('base64'),
      update: Buffer.from(update).toString('base64'),
      vector: Buffer.from(Y.encodeStateVector(doc)).toString('base64'),
    }
  } catch (error) {
    if (error.status) throw error
    throw invalid('The whiteboard update could not be read.')
  } finally { doc.destroy() }
}

/** Save with compare-and-swap so a whole class can poll without locking the room. */
export async function lessonWhiteboardRequest(db, roomId, tokenHash, input) {
  if (typeof input.lessonKey !== 'string' || !/^[1-6]:(?:[1-9]|10)$/.test(input.lessonKey)) throw invalid('Choose a lesson.')
  const fail = (message, status) => Object.assign(new Error(message), { status })
  for (let attempt = 0; attempt < 8; attempt++) {
    const room = (await db.query(`select r.closed, r.expires_at, r.state->>'kind' as kind,
      r.state->'lessonBoards'->>$3 as board,
      exists(select 1 from classroom_live_member m where m.room_id=r.id and m.token_hash=$2) as joined
      from classroom_live_room r where r.id=$1`, [roomId, tokenHash, input.lessonKey])).rows[0]
    if (!room) throw fail('Class not found.', 404)
    if (room.closed || (room.kind !== 'lesson' && new Date(room.expires_at) < new Date())) throw fail('This class has ended.', 410)
    if (!room.joined) throw fail('Join the class first.', 403)
    const board = syncLessonWhiteboard(room.board, input)
    if (board.saved !== room.board) {
      const saved = await db.query(`update classroom_live_room set state=jsonb_set(state, '{lessonBoards}',
        coalesce(state->'lessonBoards','{}'::jsonb) || jsonb_build_object($2::text,$3::text))
        where id=$1 and not closed and (state->'lessonBoards'->>$2) is not distinct from $4::text`,
      [roomId, input.lessonKey, board.saved, room.board])
      if (!saved.rowCount) continue
    }
    return { update: board.update, vector: board.vector }
  }
  throw fail('The board is busy. Reconnecting…', 409)
}
