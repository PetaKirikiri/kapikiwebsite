import { useEffect, useMemo, useState } from 'react'
import { readSentenceAnalysis, requestRails } from '../../lib/connectorPresentation/engine'
import { compileConnectorLibrary } from '../../lib/connectorPresentation/blueprints'
import type { BusManifestSheet, BusManifestPosCatalog } from '../../lib/busManifestContract'
import { useDesignSpaceCollection } from '../useDesignSpaceCollection'
import { useConnectorPatterns } from '../../hooks/useConnectorPatterns'
import WhiteboardShape from '../WhiteboardShape'
import { refreshConnectorPatterns } from '../../lib/connectorPresentation/patternStore'

export default function LessonQuestion({ text }: { text: string }) {
  const [analysis, setAnalysis] = useState<{ text: string; state: BusManifestSheet; catalog: BusManifestPosCatalog } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [replay, setReplay] = useState(() => Date.now())
  const { collection, error: shapeError, loading: shapesLoading, refresh: refreshShapes } = useDesignSpaceCollection({ production: true })
  const { rules, loaded: rulesLoaded, error: rulesError } = useConnectorPatterns()
  useEffect(() => {
    const controller = new AbortController()
    void readSentenceAnalysis(text, controller.signal).then(({state, catalog}) => {
      if (!controller.signal.aborted) { setAnalysis({ text, state, catalog }); setError(''); setReplay(Date.now()) }
    }).catch(() => { if (!controller.signal.aborted) setError('Rails could not load.') })
    return () => controller.abort()
  }, [text, attempt])
  const sentence = useMemo(() => {
    if (!analysis || analysis.text !== text) return null
    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = '600 16px Arial'
    return requestRails({ kind: 'sentence', text, state: analysis.state,
      families: new Map(analysis.catalog.posTypes.map(pos => [pos.posCode, pos.groupCode])),
      library: compileConnectorLibrary(collection), rules,
      textWidths: analysis.state.tokens.map(token => measure.measureText(token.surfaceText).width),
    })
  }, [analysis, collection, rules, text])
  const loading = !analysis || analysis.text !== text || (!sentence?.ready && shapesLoading) || !rulesLoaded
  const loadError = error || rulesError || (!sentence?.ready ? shapeError : null)
  const ready = !loading && !rulesError && sentence?.ready
  return <section className="lesson-question" aria-label={text}>
    {ready && sentence ? <div className="lesson-question-words" lang="mi">{sentence.words.map((word, index) => <div key={index} className="lesson-question-word" style={{ width: word.layout.slotWidth, marginRight: word.layout.gapAfter }}>
      <div className="lesson-question-rail" style={word.canvasStyle}><WhiteboardShape plan={word} filled growthId={String(replay)} grownAt={replay} /></div>
      <span>{word.text}</span>
    </div>)}</div> : <p lang="mi" className="lesson-question-plain">{text}</p>}
    {loadError ? <div className="lesson-question-status" role="alert">{ready ? 'Could not refresh rails.' : 'Rails could not load.'} <button onClick={() => { setError(''); setAttempt(value => value + 1); void refreshShapes(); void refreshConnectorPatterns() }}>Retry</button></div> : !loading && !ready ? <p className="lesson-question-status" role="status">Rails unavailable for this question.</p> : loading ? <p className="lesson-question-status" role="status">Loading rails…</p> : null}
    {ready && <button className="lesson-question-replay" aria-label="Replay rail animation" onClick={() => setReplay(Date.now())}>↻</button>}
  </section>
}
