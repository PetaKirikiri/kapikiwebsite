import { useRef, useState, type PointerEvent } from 'react'
import './ClassWhiteboard.css'

export type BoardBlock = { id: string; kind: 'predicate' | 'subject'; x: number; y: number }
export type BoardState = { revision: number; blocks: BoardBlock[] }
type Change = { op: 'add' | 'move' | 'delete' | 'clear'; block?: BoardBlock; blockId?: string; x?: number; y?: number }
type Props = { board: BoardState; teacher: boolean; pending: boolean; onChange: (change: Change) => Promise<boolean> }
const labels = { predicate: 'Predicate', subject: 'Subject' }
const WIDTH = 1000, HEIGHT = 600, BLOCK_WIDTH = 220, BLOCK_HEIGHT = 100
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

export default function ClassWhiteboard({ board, teacher, pending, onChange }: Props) {
  const canvas = useRef<HTMLDivElement>(null)
  const drag = useRef<{ block: BoardBlock; fresh: boolean; offsetX: number; offsetY: number; startX: number; startY: number } | null>(null)
  const [preview, setPreview] = useState<BoardBlock | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const busy = pending || saving
  const save = async (change: Change, next?: BoardBlock) => {
    setSaving(true)
    if (next) setPreview(next)
    try { return await onChange(change) }
    finally { setSaving(false); setPreview(null) }
  }
  const start = (event: PointerEvent<HTMLButtonElement>, block: BoardBlock, fresh: boolean) => {
    if (!teacher || busy || event.button !== 0 || !canvas.current) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = canvas.current.getBoundingClientRect()
    drag.current = { block, fresh, startX: event.clientX, startY: event.clientY,
      offsetX: fresh ? BLOCK_WIDTH / 2 : (event.clientX - rect.left) / rect.width * WIDTH - block.x,
      offsetY: fresh ? BLOCK_HEIGHT / 2 : (event.clientY - rect.top) / rect.height * HEIGHT - block.y }
    if (!fresh) { setSelected(block.id); setPreview(block) }
  }
  const position = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current, rect = canvas.current?.getBoundingClientRect()
    if (!current || !rect) return null
    return { ...current.block, x: Math.round(clamp((event.clientX - rect.left) / rect.width * WIDTH - current.offsetX, WIDTH - BLOCK_WIDTH)),
      y: Math.round(clamp((event.clientY - rect.top) / rect.height * HEIGHT - current.offsetY, HEIGHT - BLOCK_HEIGHT)) }
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const next = position(event)
    if (next) setPreview(next)
  }
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current, next = position(event), rect = canvas.current?.getBoundingClientRect()
    drag.current = null
    if (!current || !next || !rect) return
    const tapped = Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 5
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
    if (current.fresh && !inside && !tapped) { setPreview(null); return }
    const block = current.fresh && tapped ? current.block : next
    setSelected(block.id)
    if (!current.fresh && block.x === current.block.x && block.y === current.block.y) { setPreview(null); return }
    void save(current.fresh ? { op: 'add', block } : { op: 'move', blockId: block.id, x: block.x, y: block.y }, block)
  }
  const cancel = () => { drag.current = null; setPreview(null) }
  const freshBlock = (kind: BoardBlock['kind']): BoardBlock => ({ id: crypto.randomUUID(), kind, x: kind === 'predicate' ? 160 : 540, y: 180 + (board.blocks.length % 3) * 115 })
  const blocks = board.blocks.map(block => preview?.id === block.id ? preview : block)
  if (preview && !blocks.some(block => block.id === preview.id)) blocks.push(preview)
  return <section className="class-board" aria-label="Class whiteboard">
    <header className="class-board-toolbar"><h1>Whiteboard</h1>{teacher && <div className="class-board-tools">
      {(['predicate', 'subject'] as const).map(kind => <button key={kind} className={`class-board-tool is-${kind}`} disabled={busy || board.blocks.length >= 32} aria-label={`Add ${labels[kind]}`} onPointerDown={event => start(event, freshBlock(kind), true)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onClick={event => { if (event.detail === 0) { const block = freshBlock(kind); setSelected(block.id); void save({ op: 'add', block }, block) } }}>＋ {labels[kind]}</button>)}
      <button disabled={busy || !board.blocks.some(block => block.id === selected)} onClick={() => { void save({ op: 'delete', blockId: selected! }); setSelected(null) }}>Remove</button>
      <button disabled={busy || !board.blocks.length} onClick={() => { void save({ op: 'clear' }); setSelected(null) }}>Clear</button>
    </div>}</header>
    <div ref={canvas} className="class-board-canvas" aria-label="Whiteboard canvas" onPointerDown={event => { if (event.target === event.currentTarget) setSelected(null) }}>
      {blocks.map(block => <button key={block.id} className={`class-board-block is-${block.kind}${selected === block.id && teacher ? ' is-selected' : ''}`} aria-label={`${labels[block.kind]} block`} aria-pressed={teacher ? selected === block.id : undefined} disabled={!teacher || busy} style={{ left: `${block.x / WIDTH * 100}%`, top: `${block.y / HEIGHT * 100}%`, width: `${BLOCK_WIDTH / WIDTH * 100}%`, height: `${BLOCK_HEIGHT / HEIGHT * 100}%` }}
        onPointerDown={event => start(event, block, false)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}
        onKeyDown={event => {
          if (busy) return
          const steps: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }
          const step = steps[event.key]
          if (step) { event.preventDefault(); const next = { ...block, x: clamp(block.x + step[0] * (event.shiftKey ? 5 : 1), WIDTH - BLOCK_WIDTH), y: clamp(block.y + step[1] * (event.shiftKey ? 5 : 1), HEIGHT - BLOCK_HEIGHT) }; void save({ op: 'move', blockId: block.id, x: next.x, y: next.y }, next) }
          if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); void save({ op: 'delete', blockId: block.id }); setSelected(null) }
        }} onClick={event => { if (event.detail === 0) setSelected(block.id) }}>{labels[block.kind]}</button>)}
    </div>
  </section>
}
