import { Fragment } from 'react'
import type { WordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import { wordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import { useWordSupport } from './useWordSupport'

/** Dictionary help does not assign an unassessed word a grammatical role. */
export default function SupportedText({ text, context }: { text: string; context?: Omit<WordSupportTarget, 'word' | 'posCode'> }) {
  const support = useWordSupport()
  let tokenIndex = 0
  return <>{text.split(/(\s+)/u).map((word, index) => {
    if (!word || /^\s+$/u.test(word)) return <Fragment key={index}>{word}</Fragment>
    const target = wordSupportTarget(word, null, { sentence: text, tokenIndex: tokenIndex++, ...context })
    if (!/[\p{L}]/u.test(target.word)) return <Fragment key={index}>{word}</Fragment>
    return <button key={index} type="button" lang="mi" className="word-support-text word-support-trigger" aria-haspopup="dialog" aria-label={`Explain ${target.word}`} {...support.hover(target)} onClick={() => support.open(target)}>{word}</button>
  })}{support.modal}</>
}
