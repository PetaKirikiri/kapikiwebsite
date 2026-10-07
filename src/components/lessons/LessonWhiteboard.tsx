import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { lessonRoomRequest, type LessonRoom } from '../../lib/lessons/liveLesson'
import { boardStorageKey, connectBoard, copyBoard, restoreBoard } from '../../lib/lessons/whiteboard'
import WhiteboardEditor from './WhiteboardEditor'
import './LessonWhiteboard.css'

type Props = { lessonKey: string; roomId: string | null; name: string; onRoomReady: (room: string) => void }
export default function LessonWhiteboard({ lessonKey, roomId, name, onRoomReady }: Props) {
  const [document, setDocument] = useState<Y.Doc | null>(null)
  const [boardReady, setBoardReady] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const roomRequest = useRef<Promise<LessonRoom> | null>(null)
  const key = boardStorageKey(lessonKey, roomId)
  useEffect(() => {
    let stopped = false
    const doc = new Y.Doc()
    void restoreBoard(doc, key).then(saved => { if (!stopped) { setDocument(doc); setBoardReady(!roomId || saved) } }).catch(() => {
      if (!stopped) setError('Saved board could not open. Reload to try again.')
    })
    return () => { stopped = true; doc.destroy() }
  }, [key, roomId])
  useEffect(() => {
    if (!document || joined) return
    let stopped = false
    // Joining the classroom also joins its board. A roomless preview gets a
    // class link automatically; keep its existing writing when moving it over.
    roomRequest.current ??= lessonRoomRequest(roomId ?? '', roomId ? 'join' : 'create', {
      name: name.trim() && name !== 'You' ? name.trim() : roomId ? 'Student' : 'Teacher', kind: 'lesson',
    })
    void roomRequest.current.then(async room => {
      if (stopped) return
      if (roomId) setJoined(room.joined)
      else {
        await copyBoard(document, boardStorageKey(lessonKey, room.room))
        if (!stopped) onRoomReady(room.room)
      }
    }).catch(error => {
      if (!stopped) setError(error instanceof Error ? error.message : 'Could not connect to the board. Reload to try again.')
    })
    return () => { stopped = true }
  }, [document, joined, lessonKey, roomId, name, onRoomReady])
  useEffect(() => {
    if (!document || !joined || !roomId) return
    return connectBoard(document, { key, room: roomId, lesson: lessonKey, onStatus: (next, message) => { setError(message ?? ''); if (next === 'saved') setBoardReady(true) } })
  }, [document, joined, key, roomId, lessonKey])
  return <section id="lesson-whiteboard" className="lesson-whiteboard" role="tabpanel" aria-label="Whiteboard">
    {error && <p className="whiteboard-error" role="alert">{error}</p>}
    {document && joined && boardReady ? <WhiteboardEditor document={document} /> : !error && <p role="status">Opening board…</p>}
  </section>
}
