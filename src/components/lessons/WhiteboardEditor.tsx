import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { TableKit } from '@tiptap/extension-table'
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import * as Y from 'yjs'
import { isBoardStroke, PEN_COLORS, type BoardPoint, type BoardStroke } from '../../lib/lessons/whiteboard'
import WhiteboardTableTools from './WhiteboardTableTools'

const DRAWING_ORIGIN = 'local-pen'
const pathData = (points: BoardPoint[]) => points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') + (points.length === 1 ? ' l .1 .1' : '')
function Tool({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={onClick}>{children}</button>
}
export default function WhiteboardEditor({ document }: { document: Y.Doc }) {
  const [mode, setMode] = useState<'text' | 'pen' | 'eraser'>('text')
  const [color, setColor] = useState<string>(PEN_COLORS[0])
  const [strokes, setStrokes] = useState<[string, BoardStroke][]>([])
  const [draft, setDraft] = useState<BoardStroke | null>(null)
  const strokeRef = useRef<BoardStroke | null>(null)
  const drawingUndo = useRef<Y.UndoManager | null>(null)
  const [drawingHistory, setDrawingHistory] = useState({ undo: false, redo: false })
  const viewport = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const editor = useEditor({
    extensions: [StarterKit.configure({ undoRedo: false, link: false, codeBlock: false, code: false, horizontalRule: false }), TableKit, Collaboration.configure({ document })],
    editorProps: { attributes: { class: 'whiteboard-document', role: 'textbox', 'aria-label': 'Shared whiteboard document', 'aria-multiline': 'true', spellcheck: 'true' } },
  }, [document])
  const formatting = useEditorState({ editor, selector: ({ editor }) => ({ bold: editor?.isActive('bold'), italic: editor?.isActive('italic'), underline: editor?.isActive('underline'), list: editor?.isActive('bulletList'), table: editor?.isActive('table'), undo: editor?.can().undo(), redo: editor?.can().redo() }) })
  useEffect(() => {
    const layer = document.getMap<BoardStroke>('drawing')
    const undo = new Y.UndoManager(layer, { trackedOrigins: new Set([DRAWING_ORIGIN]), captureTimeout: 0 })
    drawingUndo.current = undo
    const refresh = () => setStrokes([...layer.entries()].filter((entry): entry is [string, BoardStroke] => isBoardStroke(entry[1])))
    const history = () => setDrawingHistory({ undo: undo.canUndo(), redo: undo.canRedo() })
    layer.observe(refresh); undo.on('stack-item-added', history); undo.on('stack-item-popped', history)
    const frame = requestAnimationFrame(refresh)
    return () => { cancelAnimationFrame(frame); layer.unobserve(refresh); undo.destroy(); drawingUndo.current = null }
  }, [document])
  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const observer = new ResizeObserver(() => setScale(Math.min(1, Math.max(.25, (node.clientWidth - 32) / 1000))))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const point = (event: PointerEvent<SVGSVGElement>): BoardPoint => {
    const rect = event.currentTarget.getBoundingClientRect()
    return [Math.round(Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000))), Math.round(Math.max(0, Math.min(1400, (event.clientY - rect.top) / rect.height * 1400)))]
  }
  const endStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (!strokeRef.current) return
    const stroke = strokeRef.current
    document.transact(() => document.getMap('drawing').set(crypto.randomUUID(), stroke), DRAWING_ORIGIN)
    strokeRef.current = null; setDraft(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  return <>
    <div className="whiteboard-toolbar" role="toolbar" aria-label="Whiteboard tools">
      <Tool label="Type" active={mode === 'text'} onClick={() => { setMode('text'); editor?.commands.focus() }}><span className="whiteboard-type">T</span></Tool>
      <span className="whiteboard-tool-divider" />
      <Tool label="Bold" active={formatting?.bold} disabled={mode !== 'text'} onClick={() => { editor?.chain().focus().toggleBold().run() }}><b>B</b></Tool>
      <Tool label="Italic" active={formatting?.italic} disabled={mode !== 'text'} onClick={() => { editor?.chain().focus().toggleItalic().run() }}><i>I</i></Tool>
      <Tool label="Underline" active={formatting?.underline} disabled={mode !== 'text'} onClick={() => { editor?.chain().focus().toggleUnderline().run() }}><u>U</u></Tool>
      <Tool label="Bullet list" active={formatting?.list} disabled={mode !== 'text'} onClick={() => { editor?.chain().focus().toggleBulletList().run() }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></Tool>
      <WhiteboardTableTools editor={editor} inTable={Boolean(formatting?.table)} disabled={mode !== 'text'} />
      <span className="whiteboard-tool-divider" />
      <Tool label="Drawing pen" active={mode === 'pen'} onClick={() => setMode('pen')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 12-12 4 4L8 20l-5 1 1-5ZM13 7l4 4"/></svg></Tool>
      <Tool label="Erase drawing" active={mode === 'eraser'} onClick={() => setMode('eraser')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 9-9 8 8-9 9H9l-5-5v-3ZM8 8l8 8M12 20h9"/></svg></Tool>
      {mode === 'pen' && <div className="whiteboard-pen-colors" role="group" aria-label="Pen colour">{PEN_COLORS.map((value, index) => <button type="button" key={value} aria-label={`${['Ink', 'Blue', 'Pink', 'Green'][index]} pen`} aria-pressed={color === value} style={{ '--pen-color': value } as React.CSSProperties} onClick={() => setColor(value)} />)}</div>}
      <span className="whiteboard-tool-divider" />
      <Tool label="Undo" disabled={mode === 'text' ? !formatting?.undo : !drawingHistory.undo} onClick={() => { if (mode === 'text') editor?.chain().focus().undo().run(); else drawingUndo.current?.undo() }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/></svg></Tool>
      <Tool label="Redo" disabled={mode === 'text' ? !formatting?.redo : !drawingHistory.redo} onClick={() => { if (mode === 'text') editor?.chain().focus().redo().run(); else drawingUndo.current?.redo() }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 4 5 5-5 5M21 9h-10a7 7 0 0 0 0 14"/></svg></Tool>
    </div>
    <div className="whiteboard-scroll" ref={viewport}>
      <div className="whiteboard-paper" style={{ zoom: scale }}>
        <EditorContent editor={editor} />
        <svg className={`whiteboard-drawing is-${mode}`} viewBox="0 0 1000 1400" aria-label="Drawing area" role="img" tabIndex={mode === 'text' ? -1 : 0}
          onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) drawingUndo.current?.redo(); else drawingUndo.current?.undo() } }}
          onPointerDown={event => {
            if (mode === 'text' || event.button !== 0) return
            event.preventDefault(); event.currentTarget.focus({ preventScroll: true })
            if (mode === 'eraser') {
              const id = (event.target as Element).getAttribute('data-stroke')
              if (id) document.transact(() => document.getMap('drawing').delete(id), DRAWING_ORIGIN)
              return
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            strokeRef.current = { color, points: [point(event)] }; setDraft(strokeRef.current)
          }}
          onPointerMove={event => { if (mode !== 'pen' || !strokeRef.current || strokeRef.current.points.length >= 4000) return; const next = { ...strokeRef.current, points: [...strokeRef.current.points, point(event)] }; strokeRef.current = next; setDraft(next) }}
          onPointerUp={endStroke} onPointerCancel={endStroke}>
          {strokes.map(([id, stroke]) => <path key={id} data-stroke={id} d={pathData(stroke.points)} stroke={stroke.color} className="whiteboard-stroke" />)}
          {draft && <path d={pathData(draft.points)} stroke={draft.color} className="whiteboard-stroke" />}
        </svg>
      </div>
    </div>
  </>
}
