import { useEffect, useState, type CSSProperties } from 'react'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { tagText, unresolvedSentence } from '../lib/connectorPresentation/engine'
import { translatedSegments } from '../lib/connectorPresentation/translation'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { BusManifestSheet, BusManifestPosCatalog } from '../lib/busManifestContract'
import { wordSupportTarget, type WordSupportTarget } from '../lib/connectorPresentation/wordSupport'

type Props = {
  mi: string; en?: string; state?: BusManifestSheet | null; structureId?: number
  catalog: BusManifestPosCatalog; target: WordSupportTarget; onNavigate: (target: WordSupportTarget) => void
}

/** The same accepted sentence plans and translation alignment used on Levels. */
export default function WordSupportSentence({ mi, en = '', state: savedState, catalog, target, onNavigate }: Props) {
  const [analysed, setAnalysed] = useState<BusManifestSheet | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (savedState) return
    const controller = new AbortController()
    void tagText(mi, controller.signal).then(setAnalysed).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [mi, savedState])
  const state = savedState ?? analysed ?? unresolvedSentence(mi)
  const highlighted = target.sentence === mi && target.tokenIndex != null ? target.tokenIndex : state.tokens.findIndex(token =>
    token.surfaceText.toLocaleLowerCase().replace(/[.,!?;:…]+$/u, '') === target.word.toLocaleLowerCase() && (!target.posCode || token.acceptedPosCode === target.posCode))
  if (!state.tokens.some(token => token.acceptedPosCode != null)) return <div className="word-support-visual">
    <p className="word-support-unanalysed" lang="mi">{state.tokens.map((token, index) => <span key={index}>{index > 0 ? ' ' : ''}<button className="word-support-text word-support-trigger" type="button" onClick={() => onNavigate(wordSupportTarget(token.surfaceText, null, { sentence: mi, tokenIndex: index }))}>{token.surfaceText}</button></span>)}</p>
    {en && <p className="word-support-translation" lang="en">{en}</p>}
    {(error || analysed) && <small className="word-support-note">Shapes are unavailable for this example.</small>}
  </div>
  return <div className="word-support-visual">
    <FamilyConnectorSentenceView loading={false} paragraphs={[renderUnassessedPassage(mi)]}
      savedBusManifests={[]} presentationStates={[state]}
      passageAddresses={[]} posCatalog={catalog} onBusManifestWrite={() => {}}
      showPassageLabel={false} showPassageSearch={false} readOnly onWordExplain={onNavigate} highlightedTokenIndex={highlighted}
      renderPassageSupplement={(_, materials, joins) => {
        const segments = translatedSegments(mi, materials, joins)
        return segments || en ? <p className="word-support-translation" lang="en">{segments ? segments.map((segment, index) => <span key={index}>
          {index > 0 && !segment.connectedBefore ? ' ' : null}<span title={segment.sourceText ? `Matches: ${segment.sourceText}` : undefined}>
            {segment.parts.map((part, partIndex) => <span key={partIndex} className={part.color ? 'word-support-translation-match' : undefined}
              style={part.color ? { '--translation-color': part.color } as CSSProperties : undefined}>{partIndex === 0 && segment.connectedBefore ? ' ' : null}{part.text}</span>)}
          </span>
        </span>) : en}</p> : null
      }} />
    {(error || analysed?.tokens.every(token => token.acceptedPosCode == null)) && <small className="word-support-note">Shapes are unavailable for this example.</small>}
  </div>
}
