import { createElement, useState } from 'react'
import type { WordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import WordSupportModal from './WordSupportModal'
export function useWordSupport() {
  const [target, setTarget] = useState<WordSupportTarget | null>(null)
  return { open: setTarget, modal: target ? createElement(WordSupportModal, {
    key: `${target.word}:${target.posCode}`, target, onClose: () => setTarget(null), onNavigate: setTarget,
  }) : null }
}
