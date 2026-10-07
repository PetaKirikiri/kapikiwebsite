import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

const sizes = Array.from({ length: 25 }, (_, index) => ({ rows: Math.floor(index / 5) + 1, cols: index % 5 + 1 }))
const actions = [
  ['addRowBefore', 'Row above'], ['addRowAfter', 'Row below'],
  ['addColumnBefore', 'Column left'], ['addColumnAfter', 'Column right'],
  ['deleteRow', 'Delete row'], ['deleteColumn', 'Delete column'], ['deleteTable', 'Delete table'],
] as const

export default function WhiteboardTableTools({ editor, inTable, disabled }: { editor: Editor | null; inTable: boolean; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState({ rows: 1, cols: 1 })
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  const visible = open && !disabled
  useEffect(() => {
    if (!visible) return
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const outside = (event: globalThis.PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false)
    }
    const resize = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize) }
  }, [visible])
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); return }
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const step = inTable ? 1 : 5
    const offset = { ArrowDown: step, ArrowUp: -step, ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, current + (offset ?? 0)))
    buttons[next]?.focus()
  }
  return <>
    <button ref={trigger} className="whiteboard-table-trigger" type="button" aria-label="Table" title="Table" aria-haspopup="dialog" aria-expanded={visible} aria-controls={visible ? id : undefined} disabled={disabled || !editor}
      onMouseDown={event => event.preventDefault()}
      onClick={() => {
        const rect = trigger.current!.getBoundingClientRect()
        setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 220)), top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - (inTable ? 285 : 238))) })
        setOpen(value => !value)
      }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></svg><span>Table</span>
    </button>
    {visible && createPortal(<div ref={menu} id={id} className="whiteboard-table-menu" role="dialog" aria-label={inTable ? 'Edit table' : 'Insert table'} style={position}
      onKeyDown={navigate} onMouseDown={event => event.preventDefault()}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== trigger.current) setOpen(false) }}>
      {inTable ? <div className="whiteboard-table-actions">{actions.map(([command, label]) => <button type="button" key={command} onClick={() => { editor?.chain().focus()[command]().run(); setOpen(false) }}>{label}</button>)}</div> : <>
        <span className="whiteboard-table-size" aria-live="polite">{size.cols} × {size.rows}</span>
        <div className="whiteboard-table-grid">{sizes.map(({ rows, cols }) => <button type="button" key={`${rows}:${cols}`} aria-label={`Insert table: ${rows} ${rows === 1 ? 'row' : 'rows'}, ${cols} ${cols === 1 ? 'column' : 'columns'}`} tabIndex={rows === size.rows && cols === size.cols ? 0 : -1} data-highlighted={rows <= size.rows && cols <= size.cols}
          onPointerEnter={() => setSize({ rows, cols })} onFocus={() => setSize({ rows, cols })}
          onClick={() => { editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run(); setOpen(false) }} />)}</div>
      </>}
    </div>, document.body)}
  </>
}
