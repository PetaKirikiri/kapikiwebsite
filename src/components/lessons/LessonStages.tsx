import LessonEmblem, { stageIdentityStyle } from './LessonEmblem'
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

export const LESSON_STAGES = ['Overview', 'Warm-up', 'New skill', 'Practice', 'Challenge', 'Wrap-up'] as const


export function LessonStages({ active, onSelect, wrapUpTime, whiteboard }: { active: number; onSelect: (index: number) => void; wrapUpTime?: string; whiteboard?: { active: boolean; onSelect: () => void } }) {
  const tabs = whiteboard ? [...LESSON_STAGES, 'Whiteboard'] : LESSON_STAGES
  const selected = whiteboard?.active ? LESSON_STAGES.length : active
  const select = (index: number) => index === LESSON_STAGES.length ? whiteboard?.onSelect() : onSelect(index)
  return <div className="lesson-section-tabs" style={{ '--lesson-tab-count': tabs.length } as CSSProperties} role="tablist" aria-label="Lesson stages">
    {tabs.map((label, index) => <button key={label} style={stageIdentityStyle(index)} id={`lesson-section-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls={index === LESSON_STAGES.length ? 'lesson-whiteboard' : 'lesson-section-panel'} tabIndex={selected === index ? 0 : -1} onClick={() => select(index)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
      if (next < 0) return
      event.preventDefault(); select(next); document.getElementById(`lesson-section-${next}`)?.focus()
    }}><span className="lesson-stage-number" aria-hidden="true">{index === LESSON_STAGES.length ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#28546a" strokeWidth="1.6"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="m7 22 3-5m7 5-3-5M7 7h7M7 11h4"/></svg> : <LessonEmblem stage={index} />}</span><span className="lesson-stage-label">{label}{index === 5 && <small className="lesson-wrap-time">{wrapUpTime ?? 'Last 5 min'}</small>}</span></button>)}
  </div>
}

export function LessonStagePanel({ active, children }: { active: number; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const frame = viewport.current
    const body = content.current
    if (!frame || !body) return
    let queued = 0
    let lastSize = ''
    frame.scrollTop = 0
    frame.scrollLeft = 0
    const fit = () => {
      queued = 0
      if (!frame.clientWidth || !frame.clientHeight) return
      body.style.minHeight = '0'
      body.style.zoom = '1'
      const padding = getComputedStyle(frame)
      const availableHeight = frame.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom)
      // scrollHeight also catches overflowing descendants of flex/grid children.
      const fits = () => {
        const scale = Number(body.style.zoom) || 1
        const contentHeight = Math.max(body.getBoundingClientRect().height, body.scrollHeight * scale)
        return contentHeight <= availableHeight - 2 && body.scrollWidth <= body.clientWidth + 1
      }
      if (!fits()) {
        // Responsive spacing does the primary fitting; modest scaling handles the remainder.
        let low = 0.7
        let high = 1
        for (let attempt = 0; attempt < 12; attempt++) {
          const scale = (low + high) / 2
          body.style.zoom = String(scale)
          if (fits()) low = scale
          else high = scale
        }
        body.style.zoom = String(low)
      }
      const finalScale = Number(body.style.zoom) || 1
      body.style.minHeight = `${Math.max(0, availableHeight - 2) / finalScale}px`
      lastSize = `${frame.clientWidth}:${frame.clientHeight}:${body.getBoundingClientRect().height}`
    }
    const schedule = () => { if (!queued) queued = requestAnimationFrame(fit) }
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const size = `${frame.clientWidth}:${frame.clientHeight}:${body.getBoundingClientRect().height}`
      if (size !== lastSize) schedule()
    })
    resize?.observe(frame)
    resize?.observe(body)
    const changes = new MutationObserver(schedule)
    changes.observe(body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] })
    fit()
    return () => { cancelAnimationFrame(queued); resize?.disconnect(); changes.disconnect() }
  }, [active])
  return <div className="lesson-stage-world"><div ref={viewport} id="lesson-section-panel" className="lesson-section-panel lesson-stage-frame" role="tabpanel" aria-labelledby={`lesson-section-${active}`}><div ref={content} className="lesson-stage-content">{children}</div></div></div>
}

export function LessonWrapUp() {
  return <section className="lesson-teaching-card"><h1>Wrap-up</h1><p>Questions and preparation for your next lesson.</p></section>
}
