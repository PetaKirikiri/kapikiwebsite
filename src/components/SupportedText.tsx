import { Fragment } from 'react'
import { wordSupportTarget } from '../lib/connectorPresentation/wordSupport'
import { useWordSupport } from './useWordSupport'

/** Unassessed text opens dictionary support without inventing a grammatical role. */
export default function SupportedText({ text }: { text: string }) {
  const support = useWordSupport()
  return <>{text.split(/\s+/u).map((word, tokenIndex) => <Fragment key={tokenIndex}>{tokenIndex > 0 ? ' ' : ''}<button type="button" className="word-support-text word-support-trigger" aria-label={`Explain ${word}`} onClick={() => support.open(wordSupportTarget(word, null, { sentence: text, tokenIndex }))}>{word}</button></Fragment>)}{support.modal}</>
}
