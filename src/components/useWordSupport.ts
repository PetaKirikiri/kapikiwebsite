import { createElement, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { WordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import WordSupportModal from './WordSupportModal'
export function useWordSupport() {
  const [target, setTarget] = useState<WordSupportTarget | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function cancelHover() { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => cancelHover, [])
  function open(next: WordSupportTarget) { cancelHover(); setTarget(next) }
  function hover(next: WordSupportTarget, onOpen: (target: WordSupportTarget) => void = open) {
    return {
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        cancelHover()
        if (event.pointerType === 'touch') return
        timer.current = setTimeout(() => { timer.current = null; onOpen(next) }, 500)
      },
      onPointerLeave: cancelHover,
      onPointerDown: cancelHover,
    }
  }
  return { open, hover, modal: target ? createElement(WordSupportModal, {
    key: `${target.word}:${target.posCode}`, target, onClose: () => setTarget(null), onNavigate: setTarget,
  }) : null }
}
