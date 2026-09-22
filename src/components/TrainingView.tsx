import { useEffect, useMemo, useRef, useState } from 'react'
import type { WebsitePreviewData } from './WebsiteView'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import { unresolvedSentence } from '../lib/connectorPresentation/engine'
import { trainingExamples, trainingAlternative } from '../lib/trainingProgression'
import './TrainingView.css'

export default function TrainingView({ data, error = null }: { data: WebsitePreviewData | null | undefined; error?: string | null }) {
  const examples = useMemo(() => trainingExamples(data?.sentences ?? []).filter((item, index, all) => item.sentence.training?.active === true && trainingAlternative(all, index) != null), [data])
  return <section className="training" aria-label="Training app">
    {error ? <p role="alert">{error}</p> : null}
    {!data ? <p role="status">{error ? 'Training examples are unavailable.' : 'Loading sentence patterns…'}</p> :
      new Set(examples.map(item => item.meaning.toLocaleLowerCase())).size < 2 ? <p>No practice available yet.</p> :
      <TrainingRound key={`${examples.map(item => `${item.sentence.structureId}:${item.meaning}`).join('|')}`} examples={examples} data={data} />}
  </section>
}

function TrainingRound({ examples, data }: { examples: ReturnType<typeof trainingExamples>; data: WebsitePreviewData }) {
  const [index, setIndex] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')
  const [answerSaved, setAnswerSaved] = useState(false)
  const nextIndex = useRef<number | null>(null)
  const position = useRef(0)
  useEffect(() => { const controller = new AbortController(); void fetch('/__training_profile', { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error('Could not load progress.'); return response.json() }).then(profile => { position.current = profile.position; const found = examples.findIndex(item => item.sentence.training?.questionId === profile.questionId); setIndex(found >= 0 ? found : profile.position % examples.length) }).catch(error => { if (!controller.signal.aborted) setSaveError(error.message) }); return () => controller.abort() }, [])
  const [selected, setSelected] = useState<number | null>(null)
  const [correctSide, setCorrectSide] = useState(() => Math.random() < 0.5 ? 0 : 1)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const current = examples[(index ?? 0) % examples.length]!
  const alternative = trainingAlternative(examples, (index ?? 0) % examples.length)!
  const choices = correctSide === 0 ? [current.meaning, alternative.meaning] : [alternative.meaning, current.meaning]
  async function choose(side: number) {
    if (selected !== null || index === null) return
    setSelected(side); setSaveError('')
    try {
      const response = await fetch('/__training_attempt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: crypto.randomUUID(), structureId: current.sentence.structureId, questionId: current.sentence.training?.questionId, answer: choices[side], position: position.current + 1 }) })
      if (!response.ok) throw new Error('Answer not saved. Try again.')
      const saved = await response.json()
      const found = examples.findIndex(item => item.sentence.training?.questionId === saved.questionId)
      nextIndex.current = found >= 0 ? found : (index + 1) % examples.length
      position.current += 1
      setAnswerSaved(true)
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Answer not saved.'); setSelected(null) }
  }
  useEffect(() => {
    if (!answerSaved) return
    const timer = window.setTimeout(() => {
      setIndex(value => nextIndex.current ?? ((value ?? 0) + 1))
      setAnswerSaved(false)
      setSelected(null)
      setCorrectSide(Math.random() < 0.5 ? 0 : 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [answerSaved])
  if (index === null) return <p role="status">{saveError || 'Loading…'}</p>
  return <>
    {saveError ? <p role="alert">{saveError}</p> : null}
    <div className="site-card training-card" tabIndex={0} aria-label="Māori sentence. When choices are shown, swipe or use left and right arrow keys."
      onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(event.key === 'ArrowLeft' ? 0 : 1) } }}
      onPointerDown={event => { origin.current = { x: event.clientX, y: event.clientY } }}
      onPointerCancel={() => { origin.current = null }}
      onPointerUp={event => { const start = origin.current; origin.current = null; if (!start) return; const dx = event.clientX - start.x; if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.4) choose(dx < 0 ? 0 : 1) }}>
      <div className="training-prompt" lang="mi">
      {current.sentence.training?.skillKey ? <p className="training-variant-sentence">{current.sentence.textMi}</p> : <FamilyConnectorSentenceView key={current.sentence.training?.questionId} loading={false}
        paragraphs={[renderUnassessedPassage(current.sentence.textMi)]}
        savedBusManifests={[{ savedAt: 'training-preview', stateFingerprint: `training-${current.sentence.structureId}`, sourceOrderIndex: current.sentence.sortOrder, paragraphText: current.sentence.textMi, sourceAddress: { structureId: current.sentence.structureId }, state: current.sentence.state ?? unresolvedSentence(current.sentence.textMi) }]}
        passageAddresses={[{ structureId: current.sentence.structureId }]} posCatalog={data.catalog}
        onBusManifestWrite={() => {}} showPassageSearch={false} showPassageLabel={false} readOnly />}
      </div>
        <div className="training-choices">{choices.map((meaning, side) => <button key={side} disabled={selected !== null}
          className={selected !== null ? side === correctSide ? 'training-correct' : selected === side ? 'training-incorrect' : '' : ''}
          onClick={() => choose(side)}><span className="training-answer-text">{meaning}</span><span className="training-answer-mark" aria-hidden="true">{selected !== null && side === correctSide ? '✓' : selected === side ? '×' : ''}</span></button>)}</div>
    </div>

  </>
}
