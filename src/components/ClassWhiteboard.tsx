import { useWordSupport } from './useWordSupport'
import { wordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import { requestRails } from '../lib/connectorPresentation/engine'
import { CONNECTOR_RAIL_LAYOUT } from '../lib/connectorPresentation/layout'
import type { BusManifestSheet } from '../lib/busManifestContract'
import WhiteboardShape from './WhiteboardShape'
import SavedConnectorCheckpoint from './SavedConnectorCheckpoint'
import './ClassWhiteboard.css'

export type BoardBlock = { id: string; kind: 'predicate' | 'subject' | 'name' | 'determiner'; structureId?: number; tokenIndex?: number; x: number; y: number; text?: string; posCode?: string | null; matchStatus?: 'empty' | 'matched' | 'mismatch' | 'unknown'; matchSource?: string | null; growthId?: string; grownAt?: number }
export type BoardState = { revision: number; blocks: BoardBlock[]; analysis?: { textMi: string; state: BusManifestSheet }; example?: { structureId: number; textMi: string; state: BusManifestSheet; posTypes: {posCode: string; groupCode: string}[] } }
type Change = { op: 'example' | 'add' | 'move' | 'delete' | 'clear' | 'word' | 'grow'; text?: string; structureId?: number; block?: BoardBlock; blockId?: string; x?: number; y?: number }
type Props = { board: BoardState; teacher: boolean; pending: boolean; onChange: (change: Change) => Promise<boolean> }
const labels = { predicate: 'Nominal predicate', subject: 'Noun', name: 'Name', determiner: 'Determiner' }
const WIDTH = 1000, HEIGHT = 600, BLOCK_WIDTH = 220, BLOCK_HEIGHT = 100
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

function BoardWord({ block, teacher, busy, focus, onChange, onExplain }: { onExplain:()=>void; block: BoardBlock; teacher: boolean; busy: boolean; focus: boolean; onChange: (change: Change) => Promise<boolean> }) {
  const [draft, setDraft] = useState(block.text ?? '')
  const input = useRef<HTMLInputElement>(null)
  const dirty = useRef(false)
  useEffect(() => { if (!dirty.current || draft === block.text) { dirty.current = false; setDraft(block.text ?? '') } }, [block.text, draft])
  useEffect(() => { if (focus) input.current?.focus() }, [focus])
  useEffect(() => {
    if (!teacher || busy || !dirty.current || draft === (block.text ?? '')) return
    const timer = window.setTimeout(() => { void onChange({ op: 'word', blockId: block.id, text: draft }) }, 700)
    return () => clearTimeout(timer)
  }, [draft, block.id, block.text, teacher, busy, onChange])
  const unmatched = draft === block.text && (block.matchStatus === 'unknown' || block.matchStatus === 'mismatch')
  return <div className="board-word-editor">
    {teacher ? <input ref={input} aria-label={`Word for ${labels[block.kind]}`} placeholder="Type a word" value={draft} maxLength={60} autoComplete="off" spellCheck={false} onChange={event => { dirty.current = true; setDraft(event.target.value) }} onKeyDown={event => { if (event.key === 'Enter' && !busy) { event.preventDefault(); void onChange({ op: 'word', blockId: block.id, text: draft }) } }} /> : <button className="board-word-text word-support-text word-support-trigger" onClick={onExplain} aria-label={`Explain ${block.text}`}>{block.text}</button>}
    {teacher && block.text && <button className="board-word-help" aria-label={`Explain ${block.text}`} onClick={onExplain}>ⓘ</button>}
    {unmatched && teacher && <div className="board-word-match"><span>No recognised POS for this shape</span></div>}
  </div>
}
export default function ClassWhiteboard({ board, teacher, pending, onChange }: Props) {
  const wordSupport=useWordSupport()
  const { collection, error: shapeError } = useDesignSpaceCollection({ production: true })
  const { rules } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  const example = board.example
  const loadingExample = useRef(false)
  useEffect(() => { if (!teacher || example || loadingExample.current) return; loadingExample.current = true; void onChange({ op: 'example', structureId: 1 }).then(ok => { if (!ok) loadingExample.current = false }) }, [teacher, example, onChange])
  const plans = useMemo(() => {
    if (!example?.state) return []
    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = '600 16px Arial'
    return requestRails({ kind: 'sentence', text: example.textMi, state: example.state,
      families: new Map(example.posTypes.map(pos => [pos.posCode, pos.groupCode])), library, rules,
      textWidths: example.state.tokens.map(token => measure.measureText(token.surfaceText).width),
    }).words
  }, [example, library, rules])
  const actualPlans = useMemo(() => {
    if (!board.analysis || !example) return []
    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = '600 16px Arial'
    return requestRails({ kind: 'sentence', text: board.analysis.textMi, state: board.analysis.state,
      families: new Map(example.posTypes.map(pos => [pos.posCode, pos.groupCode])), library, rules,
      textWidths: board.analysis.state.tokens.map(token => measure.measureText(token.surfaceText).width),
    }).words
  }, [board.analysis, example, library, rules])
  const tools = plans.flatMap((plan, tokenIndex) => {
    const kind = plan.exerciseRole
    return kind ? [{ kind, label: labels[kind], plan, tokenIndex }] : []
  })
  const indexFor = (block: BoardBlock) => block.tokenIndex ?? tools.find(tool => tool.kind === block.kind)?.tokenIndex ?? -1
  const planFor = (block: BoardBlock) => (block.posCode && board.analysis ? actualPlans : plans)[indexFor(block)] ?? null
  const explainBlock=(block:BoardBlock)=>{if(block.text)wordSupport.open(wordSupportTarget(block.text,block.posCode??null,{color:planFor(block)?.presentation.materialColor}))}
  const [canvasWidth, setCanvasWidth] = useState(1000)
  const boardScale = 3
  const displayScale = boardScale * canvasWidth / WIDTH
  const widthFor = (block: BoardBlock) => (planFor(block)?.layout.slotWidth ?? 80) * boardScale
  const [focusWord, setFocusWord] = useState<string | null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  useEffect(() => { const element = canvas.current; if (!element) return; const observer = new ResizeObserver(() => setCanvasWidth(element.clientWidth)); setCanvasWidth(element.clientWidth); observer.observe(element); return () => observer.disconnect() }, [])
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
      offsetX: fresh ? widthFor(block) / 2 : (event.clientX - rect.left) / rect.width * WIDTH - block.x,
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
    let block = current.fresh && tapped ? current.block : next
    // Align dropped materials to the sentence engine's exact cell boundary.
    const index = indexFor(block)
    const previous = board.blocks.find(item => indexFor(item) === index - 1)
    if (previous && Math.abs(block.y - previous.y) < 65) {
      const previousPlan = planFor(previous)
      const x = previous.x + widthFor(previous) + (previousPlan?.layout.joinsNext ? 0 : previousPlan?.layout.gapAfter ?? 0) * displayScale / canvasWidth * WIDTH
      if (Math.abs(block.x - x) < 110) block = { ...block, x: clamp(x, WIDTH - BLOCK_WIDTH), y: previous.y }
    }
    setSelected(block.id)
    if (!current.fresh && block.x === current.block.x && block.y === current.block.y) { setPreview(null); return }
    void save(current.fresh ? { op: 'add', block } : { op: 'move', blockId: block.id, x: block.x, y: block.y }, block).then(ok => { if (ok && current.fresh) setFocusWord(block.id) })
  }
  const cancel = () => { drag.current = null; setPreview(null) }
  const freshBlock = (kind: BoardBlock['kind']): BoardBlock => ({ id: crypto.randomUUID(), kind, structureId: example?.structureId, tokenIndex: tools.find(tool => tool.kind === kind)?.tokenIndex, x: 120 + tools.findIndex(tool => tool.kind === kind) * 165, y: 180 })
  const blocks = board.blocks.map(block => preview?.id === block.id ? preview : block)
  if (preview && !blocks.some(block => block.id === preview.id)) blocks.push(preview)
  // Keep already-docked cells exact when the shared sentence scale changes.
  for (const block of [...blocks].sort((a, b) => indexFor(a) - indexFor(b))) {
    if (preview?.id === block.id) continue
    const previous = blocks.find(item => indexFor(item) === indexFor(block) - 1)
    if (!previous) continue
    const plan = planFor(previous)
    const x = previous.x + widthFor(previous) + (plan?.layout.joinsNext ? 0 : plan?.layout.gapAfter ?? 0) * boardScale
    if (Math.abs(block.x - x) < 25 && Math.abs(block.y - previous.y) < 20) {
      const at = blocks.findIndex(item => item.id === block.id)
      blocks[at] = { ...block, x, y: previous.y }
    }
  }
  return <section className="class-board" aria-label="Class whiteboard">
    {teacher && <aside className="class-board-tools" aria-label="Whiteboard tools">
      <span className="board-tool-pointer" aria-hidden="true">↖</span>
      {tools.map(tool => <button key={tool.kind} className="class-board-tool" title={tool.label} disabled={busy || board.blocks.length >= 32 || tool.plan.presentation.face?.status === 'unavailable'} aria-label={`Add ${tool.label}`} onPointerDown={event => start(event, freshBlock(tool.kind), true)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onClick={event => { if (event.detail === 0) { const block = freshBlock(tool.kind); setSelected(block.id); void save({ op: 'add', block }, block).then(ok => { if (ok) setFocusWord(block.id) }) } }}><WhiteboardShape plan={tool.plan} filled/><small>{tool.kind === 'predicate' ? 'Nominal' : tool.label}</small></button>)}
      <span className="board-tool-divider"/>
      <button className="board-icon-tool" title="Replay germination" aria-label="Replay germination" disabled={busy || !board.blocks.find(block => block.id === selected)?.posCode} onClick={() => void save({ op: 'grow', blockId: selected! })}>↻</button>
      <button className="board-icon-tool" title="Remove selected shape" aria-label="Remove selected shape" disabled={busy || !board.blocks.some(block => block.id === selected)} onClick={() => { void save({ op: 'delete', blockId: selected! }); setSelected(null) }}>⌫</button>
      <button className="board-icon-tool board-clear" title="Clear whiteboard" aria-label="Clear whiteboard" disabled={busy || !board.blocks.length} onClick={() => { void save({ op: 'clear' }); setSelected(null) }}>×</button>
    </aside>}
    {wordSupport.modal}
    <div ref={canvas} className="class-board-canvas" aria-label="Whiteboard canvas" onPointerDown={event => { if (event.target === event.currentTarget) { setSelected(null); setFocusWord(null) } }}>
      {shapeError && <p className="board-shape-error" role="alert">Shapes could not be refreshed.</p>}
      {blocks.map(block => <article key={block.id} className={`class-board-block${selected === block.id && teacher ? ' is-selected' : ''}`} aria-label={`${labels[block.kind]} block`} style={{ left: `${block.x / WIDTH * 100}%`, top: `${block.y / HEIGHT * 100}%`, width: `${widthFor(block) / WIDTH * 100}%`, '--board-overhang': `${CONNECTOR_RAIL_LAYOUT.connectionWidth / 2 * displayScale}px`, '--board-material-height': `${CONNECTOR_RAIL_LAYOUT.storyHeight * displayScale}px`, '--board-word-size': `${16 * displayScale}px` } as React.CSSProperties}>
        <button className="board-shape-handle" aria-label={teacher?`Move ${labels[block.kind]} shape`:`Explain ${block.text} shape`} disabled={busy || (!teacher && !block.text)}
          onPointerDown={event => { if(teacher){setFocusWord(null); start(event, block, false)} }} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}
          onDoubleClick={() => setFocusWord(block.id)} onKeyDown={event => {
            if (busy) return
            if (!teacher) return
            const steps: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }
            const step = steps[event.key]
            if (step) { event.preventDefault(); const next = { ...block, x: clamp(block.x + step[0] * (event.shiftKey ? 5 : 1), WIDTH - BLOCK_WIDTH), y: clamp(block.y + step[1] * (event.shiftKey ? 5 : 1), HEIGHT - BLOCK_HEIGHT) }; void save({ op: 'move', blockId: block.id, x: next.x, y: next.y }, next) }
            if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); void save({ op: 'delete', blockId: block.id }); setSelected(null) }
            if (event.key === 'Enter') { event.preventDefault(); setFocusWord(block.id) }
          }} onClick={event => { if(!teacher)explainBlock(block);else if (event.detail === 0) setSelected(block.id) }}>
          <WhiteboardShape plan={planFor(block)} filled={Boolean(block.posCode)} growthId={block.growthId} grownAt={block.grownAt}/>
        </button>
        <BoardWord onExplain={()=>explainBlock(block)} block={block} teacher={teacher} busy={busy} focus={focusWord === block.id} onChange={onChange}/>
      </article>)}
      {blocks.map(block => {
        const plan = planFor(block)
        const next = blocks.find(item => indexFor(item) === indexFor(block) + 1)
        if (!plan?.layout.joinsNext || !plan.presentation.face || !next?.posCode || !block.posCode
          || Math.abs(next.x - block.x - widthFor(block)) > .1 || next.y !== block.y
          || [block, next].some(item => Date.now() - (item.grownAt ?? 0) < 2600)) return null
        return <span key={`join-${block.id}`} className="board-shared-join" style={{ left: `calc(${next.x / WIDTH * 100}% - ${CONNECTOR_RAIL_LAYOUT.connectionWidth / 2 * displayScale}px)`, top: `calc(${block.y / HEIGHT * 100}% + 6px)` }}>
          <SavedConnectorCheckpoint plan={plan.presentation.face} displayHeight={CONNECTOR_RAIL_LAYOUT.storyHeight * displayScale}/>
        </span>
      })}
    </div>
  </section>
}
