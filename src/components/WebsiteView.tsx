import { useEffect, useMemo, useState } from 'react'
import type { BusManifestSheet } from '../lib/busManifestContract'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { ReviewDeskPosCatalog, SavedBusManifest } from '../lib/busManifestTeam/reviewDeskGateway'
import type { BusManifestUserWrite } from './BusManifestReviewView'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { unresolvedSentence as blankSheet } from '../lib/connectorPresentation/engine'
import './WebsiteView.css'
import CapabilitiesDashboard from './CapabilitiesDashboard'
import StudentPortal from './studentPortal/StudentPortal'
import { translatedSegments } from '../lib/connectorPresentation/translation'
import type { CSSProperties } from 'react'
import TrainingView from './TrainingView'
import TrainingNavigation from './TrainingNavigation'
import TrainingAdmin from './TrainingAdmin'
import KaPikiWordmark from './KaPikiWordmark'
import NavigationRail from './NavigationRail'
import { WORD_CLASS_VISUAL_PALETTE } from './railVisualPalette'
import IsolatedAnchorView from './IsolatedAnchorView'
import ClassroomRoom from './ClassroomRoom'

export type WebsitePreviewSentence = {
  readonly structureId: number
  readonly sortOrder: number
  readonly textMi: string
  readonly curriculumLevel: number | null
  readonly training?: { correct: string; alternative: string; active: boolean; questionId?: string; skillKey?: string; variants?: { questionId: string; textMi: string; correct: string; alternative: string; skillKey: string }[] }
  readonly state: BusManifestSheet | null
}

export type WebsitePreviewData = {
  readonly sentences: readonly WebsitePreviewSentence[]
  readonly catalog: ReviewDeskPosCatalog
}

type WebsiteViewProps = {
  /**
   * The main local app supplies its already-connected Review Desk snapshot.
   * Omit this prop only for the isolated Website preview entry point.
   */
  readonly localData?: WebsitePreviewData | null
  readonly localError?: string | null
}

type CurriculumLevel = 1 | 2 | 3 | 4 | 5 | 6


function demoManifest(
  sentence: WebsitePreviewSentence,
  state: BusManifestSheet,
  displayOrderIndex = sentence.sortOrder,
): SavedBusManifest {
  return {
    savedAt: 'website-preview',
    stateFingerprint: `website-preview-${sentence.structureId}`,
    sourceOrderIndex: displayOrderIndex,
    paragraphText: sentence.textMi,
    sourceAddress: { structureId: sentence.structureId },
    state,
  }
}

export default function WebsiteView({
  localData,
  localError = null,
}: WebsiteViewProps = {}) {
  const connectedLocally = localData !== undefined
  const [fetchedData, setFetchedData] = useState<WebsitePreviewData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [localStates, setLocalStates] = useState<ReadonlyMap<number, BusManifestSheet>>(new Map())
  const [navReplay, setNavReplay] = useState(0)
  const [methodStep, setMethodStep] = useState(0)
  const [completedNav, setCompletedNav] = useState('')
  const [ourReveal, setOurReveal] = useState(100)
  const [selectedLevel, setSelectedLevel] = useState<CurriculumLevel>(1)
  const [accountOpen, setAccountOpen] = useState(() => ['#account', '#join'].includes(window.location.hash))
  const [activeSection, setActiveSection] = useState(() => window.location.hash || '#level-finder')
  useEffect(() => {
    const openAccount = () => {
      setActiveSection(window.location.hash || '#level-finder')
      if (['#account', '#join'].includes(window.location.hash)) setAccountOpen(true)
    }
    window.addEventListener('hashchange', openAccount)
    return () => window.removeEventListener('hashchange', openAccount)
  }, [])

  useEffect(() => {
    if (connectedLocally) return
    const controller = new AbortController()
    void fetch('/__website_preview_data', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The course examples could not load (${response.status}).`)
        return response.json() as Promise<WebsitePreviewData>
      })
      .then(async course => {
        const response = await fetch('/__training_content', { signal: controller.signal })
        if (!response.ok) throw new Error('App content could not load from the database.')
        const { content } = await response.json() as { content: { structureId: number; textMi: string; correct: string; alternative: string; active: boolean }[] }
        setFetchedData({ ...course, sentences: course.sentences.map(sentence => ({ ...sentence, training: content.find(row => row.structureId === sentence.structureId && row.textMi === sentence.textMi) })) })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setFetchError(cause instanceof Error ? cause.message : 'The course examples could not load.')
        }
      })
    return () => controller.abort()
  }, [connectedLocally])

  const data = connectedLocally ? localData : fetchedData
  const error = connectedLocally ? localError : fetchError

  const states = useMemo(() => {
    const next = new Map<number, BusManifestSheet>()
    data?.sentences.forEach((sentence) => {
      next.set(sentence.structureId, localStates.get(sentence.structureId) ?? sentence.state ?? blankSheet(sentence.textMi))
    })
    return next
  }, [data, localStates])

  const handleLocalWrite = (write: BusManifestUserWrite) => {
    setLocalStates((current) => {
      const next = new Map(current)
      next.set(write.sourceAddress.structureId, write.state)
      return next
    })
  }

  const changeLevel = (nextLevel: CurriculumLevel) => {
    const scrollTop = window.scrollY
    setSelectedLevel(nextLevel)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollTop)
    }))
  }

  const levelSentences = data?.sentences.filter((sentence) => sentence.curriculumLevel === selectedLevel) ?? []
  const courseOrderByStructureId = useMemo(() => {
    const ordered = data?.sentences
      .filter((sentence) => sentence.curriculumLevel != null)
      .slice()
      .sort((left, right) => (left.curriculumLevel! - right.curriculumLevel!) || (left.sortOrder - right.sortOrder)) ?? []
    return new Map(ordered.map((sentence, index) => [sentence.structureId, index]))
  }, [data])

  const methodologySentences = ['I whai te manu whero i te manu kākāriki', 'Me whai te manu whero i te manu kākāriki']
    .flatMap(text => data?.sentences.filter(sentence => sentence.textMi.replace(/[.!]$/u, '') === text) ?? [])
  const methodologyReady = !!methodologySentences[0]?.state
  useEffect(() => {
    if (!['#methodology', '#website-top'].includes(activeSection) || !methodologyReady) return
    setMethodStep(0)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setMethodStep(3); return }
    const timers = [1, 2, 3].map(step => window.setTimeout(() => {
      document.getElementById(`method-step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      timers.push(window.setTimeout(() => setMethodStep(step), 850))
    }, 7600 + (step - 1) * 4800))
    return () => timers.forEach(clearTimeout)
  }, [activeSection, methodologyReady])

  if (activeSection === '#classroom') return <ClassroomRoom data={data} error={error} />
  if (activeSection === '#training' || activeSection === '#training-admin') {
    return <main className="training-app" aria-label="Ka Piki training app">
      <TrainingNavigation />
      {activeSection === '#training-admin' ? <TrainingAdmin data={data} error={error} /> : <TrainingView data={data} error={error} />}
    </main>
  }

  return (
    <section id="website-top" aria-label="Website" data-testid="website-workspace" className="maori-site">
      <header className="site-header">
        <a href="#website-top" className="site-wordmark" aria-label="Ka Piki"><KaPikiWordmark /></a>
        <nav aria-label="Website navigation" className="site-nav">
          {[
            ['#methodology', 'Methodology'],
            ['#level-finder', 'Levels'],
            ['#competency', 'Capabilities'],
            ['#training', 'APP'],
          ].map(([href, label]) => {
            const active = activeSection === href || (href === '#methodology' && activeSection === '#website-top') || (href === '#level-finder' && activeSection === '#teacher')
            const journey = `${activeSection}:${navReplay}`
            const prefix = href === '#competency' ? 'Your' : href === '#methodology' || href === '#level-finder' ? 'Our' : undefined
            const showPrefix = !!prefix && active && completedNav === journey
            return <a key={href} href={href} onClick={() => { setCompletedNav(''); if (active) setNavReplay(value => value + 1) }} aria-label={prefix ? `${prefix} ${label}` : undefined} aria-current={active ? 'location' : undefined} className={`site-nav-item${active ? ' site-nav-item-active' : ''}`}>
              {prefix ? <span className={`site-nav-prefix${showPrefix ? ' site-nav-prefix-visible' : ''}`} aria-hidden="true"><span style={{ clipPath: `inset(0 0 0 ${ourReveal}%)` }}>{prefix}&nbsp;</span></span> : null}
              <span className="site-nav-anchor">{active ? <NavigationRail key={navReplay} noun={!!prefix} leftWord={prefix} onLeftReveal={setOurReveal} onComplete={() => setCompletedNav(journey)} /> : null}{label}</span>
            </a>
          })}
        </nav>
      </header>

      {activeSection === '#methodology' || activeSection === '#website-top' ? <section id="methodology" className="site-methodology" aria-label="Methodology">
        <div className="methodology-simple-examples">
          <div id="method-step-0" className={`methodology-step${methodStep === 0 ? ' methodology-step-active' : ''}`}>
          <p>Put the words in ORDER.</p>
          {data && methodologySentences[0]?.state ? <div className="methodology-word-order methodology-order-growth" aria-label="bird eat food becomes eat bird food">
            {([
              ['noun', 'the', 'bird'], ['verb', 'past', 'eat'], ['noun', 'my', 'food'],
            ] as const).map(([example, left, anchor]) => <div key={anchor} className={`methodology-order-${anchor}`}>
              <IsolatedAnchorView state={methodologySentences[0]!.state!} catalog={data.catalog} presentation germinationOnly example={example}
                displayWords={{ left, anchor }} prefixStage="hidden" growAnchor />
            </div>)}
          </div> : <p role="status">{error ?? 'Loading example…'}</p>}
          </div>
          {data && methodologySentences[0]?.state ? <>
            {(['noun', 'verb'] as const).map((step, index) => <div key={step} id={`method-step-${index + 1}`} className={`methodology-step${methodStep === index + 1 ? ' methodology-step-active' : ''}`}>
            <p><span style={{ color: WORD_CLASS_VISUAL_PALETTE[step] }}>{step === 'noun' ? 'Nouns' : 'Verbs'}</span> need <span style={{ color: step === 'noun' ? WORD_CLASS_VISUAL_PALETTE.determiner : WORD_CLASS_VISUAL_PALETTE.tam }}>{step === 'noun' ? 'WHICH' : 'WHEN'}</span> words.</p>
            <div className="methodology-sentence-line" style={{ minHeight: 94 }}>
              {<>
              {([
                ['verb', 'past', 'eat'],
                ['noun', 'the', 'bird'],
                ['noun', 'my', 'food'],
              ] as const).map(([example, left, anchor]) => <IsolatedAnchorView key={anchor}
                state={methodologySentences[0]!.state!} catalog={data.catalog} presentation germinationOnly example={example}
                displayWords={{ left, anchor }} active={methodStep >= index + 1}
                prefixStage={step === 'noun' && example === 'verb' ? 'hidden' : step === 'verb' && example === 'noun' ? 'complete' : undefined}
              />)}
              </>}
            </div>
            </div>)}
            <div id="method-step-3" className={`methodology-step${methodStep === 3 ? ' methodology-step-active' : ''}`}>
            <p>Marker the VICTIM or the DOER.</p>
            <div className="methodology-sentence-line">
              {([
                ['verb', 'past', 'eat'],
                ['noun', 'the', 'bird'],
                ['who', 'my', 'food'],
              ] as const).map(([example, left, anchor]) => <IsolatedAnchorView key={anchor}
                state={methodologySentences[0]!.state!} catalog={data.catalog} presentation germinationOnly example={example}
                displayWords={{ left, anchor }} active={methodStep >= 3} prefixStage="complete"
              />)}
            </div>
            </div>
          </> : <p role="status">{error ?? 'Loading example…'}</p>}
        </div>
      </section> : activeSection === '#competency' ? <section id="competency" className="site-methodology" aria-label="Capabilities">
        <CapabilitiesDashboard />
      </section> : <section id="level-finder" className="site-learning">
        <header className="site-level-header">
          <h1>Find your level.</h1>
          <nav className="site-level-nav" aria-label="Choose your level">
            <div className="site-level-buttons">{([1, 2, 3, 4, 5, 6] as const).map(level => <button key={level} type="button" aria-label={`Level ${level}`} aria-pressed={selectedLevel === level} disabled={data == null} onClick={() => changeLevel(level)}>{level}</button>)}</div>
          </nav>
          <button type="button" className="site-level-signup" onClick={() => setAccountOpen(true)}>Sign up · Level {selectedLevel}</button>
        </header>
        {error != null ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
        {data == null && error == null ? (
          <p role="status" className="site-loading">Loading levels…</p>
        ) : null}

        {data != null ? <>
          <div className="site-level-layout">
            <div className="site-sentence-panel">
            <div className="site-sentences" aria-label={`Level ${selectedLevel} sentence structures`}>
              {levelSentences.length === 0 ? <p className="px-3 py-6 text-slate-600">No sentence structures assigned to this level yet.</p> :
              <FamilyConnectorSentenceView
                key={selectedLevel}
                loading={false}
                paragraphs={levelSentences.map((sentence) => renderUnassessedPassage(sentence.textMi))}
                savedBusManifests={levelSentences.map((sentence) => demoManifest(sentence,
                  states.get(sentence.structureId) ?? blankSheet(sentence.textMi),
                  courseOrderByStructureId.get(sentence.structureId) ?? sentence.sortOrder))}
                posCatalog={data.catalog}
                passageAddresses={levelSentences.map((sentence) => ({ structureId: sentence.structureId }))}
                onBusManifestWrite={handleLocalWrite}
                showPassageSearch={false}
                showPassageLabel={false}
                showStructureNotes
                collapsibleStructureNotes
                renderPassageSupplement={(index, materials, joins) => {
                  const segments = translatedSegments(levelSentences[index]!.textMi, materials, joins)
                  return <div className="site-translation" lang="en" aria-label="English translation">
                    {segments ? segments.map((segment, part) => <span key={part}>
                      {part > 0 && !segment.connectedBefore ? ' ' : null}<span title={segment.sourceText ? `Matches: ${segment.sourceText}` : undefined}>
                        {segment.parts.map((piece, pieceIndex) => <span key={pieceIndex} className={piece.color ? 'site-translation-match' : undefined}
                          style={piece.color ? { '--translation-color': piece.color } as CSSProperties : undefined}>{pieceIndex === 0 && segment.connectedBefore ? ' ' : null}{piece.text}</span>)}
                      </span>
                    </span>) : <span>Translation not yet available.</span>}
                  </div>
                }}
                readOnly
              />}
            </div>
            </div>
          </div>

        </> : null}
      </section>}

      <StudentPortal level={selectedLevel} open={accountOpen} onClose={() => { setAccountOpen(false); if (['#account', '#join'].includes(window.location.hash)) { window.history.replaceState(null, '', window.location.pathname + window.location.search); setActiveSection('#level-finder') } }} />
    </section>
  )
}
