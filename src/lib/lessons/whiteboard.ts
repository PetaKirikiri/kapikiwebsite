import * as Y from 'yjs'
import { get, set } from 'idb-keyval'

export type BoardStatus = 'local' | 'connecting' | 'saved' | 'saving' | 'offline'
export const boardStorageKey = (lesson: string, room?: string | null) => `ka-piki:whiteboard:v1:${room || 'local'}:${lesson}`
export const encodeBoard = (value: Uint8Array) => btoa(Array.from(value, byte => String.fromCharCode(byte)).join(''))
export const decodeBoard = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0))
export const REMOTE_BOARD = 'remote-whiteboard'
export type BoardPoint = [number, number]
export type BoardStroke = { color: string; points: BoardPoint[] }
export const PEN_COLORS = ['#294a63', '#347db0', '#cb668c', '#528352'] as const

export function isBoardStroke(value: unknown): value is BoardStroke {
  if (!value || typeof value !== 'object') return false
  const stroke = value as BoardStroke
  return (PEN_COLORS as readonly string[]).includes(stroke.color) && Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length <= 4000 && stroke.points.every(point => Array.isArray(point) && point.length === 2 && point.every(n => Number.isFinite(n) && n >= 0 && n <= 2400))
}

export async function restoreBoard(doc: Y.Doc, key: string) {
  const saved = await get<Uint8Array>(key)
  if (saved) Y.applyUpdate(doc, saved, REMOTE_BOARD)
  return Boolean(saved)
}

export async function copyBoard(doc: Y.Doc, key: string) {
  await set(key, Y.encodeStateAsUpdate(doc))
}

/** Merge updates with the classroom server; no full-document replacement on either side. */
export function connectBoard(doc: Y.Doc, options: {
  key: string; room?: string | null; lesson: string
  onStatus: (status: BoardStatus, error?: string) => void
  request?: typeof fetch
}) {
  let stopped = false
  let inFlight = false
  let serverVector: Uint8Array | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let storageQueue = Promise.resolve()
  let storageFailed = false
  let revision = 0
  const controller = new AbortController()
  const saveLocal = () => {
    const snapshot = Y.encodeStateAsUpdate(doc)
    storageQueue = storageQueue.then(() => set(options.key, snapshot)).then(() => { storageFailed = false }).catch(() => {
      storageFailed = true
      options.onStatus('offline', 'This device could not save the board. Keep this page open.')
    })
  }
  const schedule = (delay: number) => {
    clearTimeout(timer)
    if (!stopped) timer = setTimeout(() => { void sync() }, delay)
  }
  const sync = async () => {
    if (stopped || inFlight || !options.room) return
    inFlight = true
    const sentRevision = revision
    try {
      const response = await (options.request ?? fetch)('/__classroom', {
        method: 'POST', credentials: 'same-origin', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lesson-board', room: options.room, lessonKey: options.lesson,
          update: encodeBoard(Y.encodeStateAsUpdate(doc, serverVector)), vector: encodeBoard(Y.encodeStateVector(doc)) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Board could not sync.')
      if (stopped) return
      Y.applyUpdate(doc, decodeBoard(result.update), REMOTE_BOARD)
      serverVector = decodeBoard(result.vector)
      const pending = revision !== sentRevision
      if (!storageFailed) options.onStatus(pending ? 'saving' : 'saved')
      schedule(pending ? 100 : 800)
    } catch (error) {
      if (!stopped) {
        options.onStatus('offline', error instanceof Error ? error.message : 'Board could not sync.')
        schedule(2500)
      }
    } finally { inFlight = false }
  }
  const onUpdate = (_update: Uint8Array, origin: unknown) => {
    saveLocal()
    if (origin !== REMOTE_BOARD) {
      revision++
      options.onStatus(options.room ? 'saving' : 'local')
      if (!inFlight) schedule(180)
    }
  }
  doc.on('update', onUpdate)
  options.onStatus(options.room ? 'connecting' : 'local')
  if (options.room) void sync()
  return () => { stopped = true; clearTimeout(timer); controller.abort(); doc.off('update', onUpdate) }
}
