import { createPortal } from 'react-dom'
import { useEffect, useId, useRef } from 'react'
import { breakoutChoices } from '../../lib/lessons/bigWordBreakout'
import LessonBigWords from './LessonBigWords'

/** Shared engine specimens stay mounted so opening the chooser does not restart loading. */
export default function BigWordChooser({ question, onSelect, onClose }: {
  question: string | null; onSelect: (word: string) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  useEffect(() => {
    if (!question) return
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [question])
  return createPortal(<dialog ref={dialog} className="big-word-chooser" aria-labelledby={title} onCancel={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const box = event.currentTarget.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
    }}>
    <header><h2 id={title}>{question}</h2><button type="button" aria-label="Close Big word chooser" onClick={onClose}>×</button></header>
    <LessonBigWords words={breakoutChoices} onSelect={onSelect} />
  </dialog>, document.body)
}
