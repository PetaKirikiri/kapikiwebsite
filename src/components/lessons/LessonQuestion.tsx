import SupportedText from '../SupportedText'
import { useEffect, useMemo, useRef, useState } from 'react'
import { readSentenceAnalysis, requestRails } from '../../lib/connectorPresentation/engine'
import { compileConnectorLibrary } from '../../lib/connectorPresentation/blueprints'
import type { BusManifestSheet, BusManifestPosCatalog } from '../../lib/busManifestContract'
import { useDesignSpaceCollection } from '../useDesignSpaceCollection'
import { useConnectorPatterns } from '../../hooks/useConnectorPatterns'
import { refreshConnectorPatterns } from '../../lib/connectorPresentation/patternStore'
import LessonRailSpecimen from './LessonRailSpecimen'

export type LessonRailClue = { indices: readonly number[]; label: string }

export default function LessonQuestion({ text, active = true, clue }: { text: string; active?: boolean; clue?: LessonRailClue }) {
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
    return requestRails({ kind: 'sentence', text, state: analysis.state, displayMode: 'english-above',
      measureEnglish: gloss => { measure.font = '400 12px Arial'; const width = measure.measureText(gloss).width; measure.font = '600 16px Arial'; return width },
      families: new Map(analysis.catalog.posTypes.map(pos => [pos.posCode, pos.groupCode])),
      library: compileConnectorLibrary(collection), rules,
      textWidths: analysis.state.tokens.map(token => measure.measureText(token.surfaceText).width),
    })
  }, [analysis, collection, rules, text])
  const loading = !analysis || analysis.text !== text || (!sentence?.ready && shapesLoading) || !rulesLoaded
  const loadError = error || rulesError || (!sentence?.ready ? shapeError : null)
  const ready = !loading && !rulesError && sentence?.ready
  const specimen = useMemo(() => {
    if (!ready || !analysis || !clue) return []
    return requestRails({ kind: 'specimen', text, state: analysis.state,
      families: new Map(analysis.catalog.posTypes.map(pos => [pos.posCode, pos.groupCode])),
      library: compileConnectorLibrary(collection), rules, indices: clue.indices, label: clue.label,
    })
  }, [ready, analysis, clue, text, collection, rules])
  const host = useRef<HTMLDivElement>(null)
  const [playbackError, setPlaybackError] = useState('')
  const sentenceKey = ready ? JSON.stringify(sentence) : ''
  useEffect(() => {
    if (!active || !sentenceKey || !host.current) return
    let frame = 0
    frame = requestAnimationFrame(() => {
    if (!host.current) return
    try {
      const saved = JSON.parse(sentenceKey) as NonNullable<typeof sentence>
      const playback = requestRails({ kind: 'germination', sentence: saved })
      const canvases = [...host.current.querySelectorAll('canvas')]
      const words = [...host.current.querySelectorAll<HTMLElement>('[data-playback-word]')]
      playback.groups.forEach((group,i) => { canvases[i].width=group.width;canvases[i].height=group.height })
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
      const start=performance.now()
      setPlaybackError('')
      const tick=(now:number)=>{
        const state=playback.frame(now-start,reduced)
        state.groups.forEach((group,i)=>{
          canvases[i].getContext('2d')!.putImageData(group.image,0,0)
          playback.groups[i].indices.forEach((index,j)=>{ words[index].style.clipPath=`inset(0 ${(1-group.reveals[j])*100}% 0 0)` })
        })
        if(!state.complete)frame=requestAnimationFrame(tick)
      }
      tick(start)
    } catch (cause) { setPlaybackError(cause instanceof Error ? cause.message : 'Animation unavailable.') }
    })
    return ()=>cancelAnimationFrame(frame)
  }, [sentenceKey,replay,active])
  return <section className="lesson-question" aria-label={text}>
    {clue && specimen.length > 0 && <div className="lesson-rail-clue">
      <span>Look for this symbol</span>
      <span className="lesson-rail-clue-symbol" role="img" aria-label={`Rail symbol for ${clue.label}`}><LessonRailSpecimen plans={specimen} height={28} /></span>
    </div>}
    {ready && sentence ? <div ref={host} className="lesson-question-words" lang="mi">{sentence.groups.map((indices,groupIndex) => <div key={groupIndex} style={{ position:'relative', paddingTop:26, display:'flex' }}>
      <canvas role="img" aria-label="Germinating sentence section" style={{position:'absolute',top:0,left:sentence.words[indices[0]].canvasStyle.marginLeft,height:18,width:indices.reduce((sum,index)=>sum+sentence.words[index].layout.slotWidth+(index===indices.at(-1)?0:sentence.words[index].layout.gapAfter),sentence.words[indices[0]].canvasStyle.width-sentence.words[indices[0]].layout.slotWidth)}} />
      {indices.map(index=>{const word=sentence.words[index];return <div key={index} className="lesson-question-word" style={{width:word.layout.slotWidth,marginRight:word.layout.gapAfter}}>
        <div data-playback-word style={{clipPath:'inset(0 100% 0 0)'}}>
          {word.gloss && <span className="lesson-word-gloss" lang={word.gloss.language}>{word.gloss.text}</span>}
          <SupportedText text={word.text} context={{ sentence: text, tokenIndex: index, state: analysis?.state }} />
        </div>
      </div>})}
    </div>)}</div> : <p lang="mi" className="lesson-question-plain"><SupportedText text={text} /></p>}
    {playbackError && <p role="alert" className="lesson-question-status">{playbackError}</p>}
    {loadError ? <div className="lesson-question-status" role="alert">{ready ? 'Could not refresh rails.' : 'Rails could not load.'} <button onClick={() => { setError(''); setAttempt(value => value + 1); void refreshShapes(); void refreshConnectorPatterns() }}>Retry</button></div> : !loading && !ready ? <p className="lesson-question-status" role="status">Rails unavailable for this question.</p> : loading ? <p className="lesson-question-status" role="status">Loading rails…</p> : null}
    {ready && <button className="lesson-question-replay" aria-label="Replay rail animation" onClick={() => { setReplay(Date.now()) }}>↻</button>}
  </section>
}
