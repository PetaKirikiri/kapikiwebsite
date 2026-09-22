import { readWebsiteJson } from '../lib/websiteData'
import LevelCourseOverview from './LevelCourseOverview'
import CourseFormat from './CourseFormat'
import LevelOnePepeha from './LevelOnePepeha'
import GuessWhoGame from './GuessWhoGame'
import KitchenGame from './KitchenGame'
import LiveClassroom from './LiveClassroom'
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
import corporateHarakeke from '../assets/corporate-harakeke-v1.jpg'
import offerCapabilities from '../assets/offer-capabilities.png'
import offerClassroom from '../assets/offer-classroom.png'
import offerApp from '../assets/offer-app.png'
import offerGrammar from '../assets/offer-grammar.png'
import directorPortrait from '../assets/peta-kirikiri-portrait-v4.jpg'

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

// Keep existing methodology links working while its introduction is hidden.
function currentWebsiteSection() {
  const section = window.location.hash || '#website-top'
  return section === '#methodology' ? '#level-finder' : section
}


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
  const [trainingError, setTrainingError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [localStates, setLocalStates] = useState<ReadonlyMap<number, BusManifestSheet>>(new Map())
  const [navReplay, setNavReplay] = useState(0)
  const [methodStep, setMethodStep] = useState(0)
  const [completedNav, setCompletedNav] = useState('')
  const [ourReveal, setOurReveal] = useState(100)
  const [selectedLevel, setSelectedLevel] = useState<CurriculumLevel>(1)
  const [showLevelOverview, setShowLevelOverview] = useState(true)
  const [accountOpen, setAccountOpen] = useState(() => ['#account', '#join'].includes(window.location.hash))
  const [activeSection, setActiveSection] = useState(currentWebsiteSection)
  useEffect(() => {
    const openAccount = () => {
      const section = currentWebsiteSection()
      if (window.location.hash === '#methodology') window.history.replaceState(null, '', '#level-finder')
      setActiveSection(section)
      if (section === '#level-finder') setShowLevelOverview(true)
      if (['#account', '#join'].includes(window.location.hash)) setAccountOpen(true)
    }
    openAccount()
    window.addEventListener('hashchange', openAccount)
    return () => window.removeEventListener('hashchange', openAccount)
  }, [])

  useEffect(() => {
    if (connectedLocally) return
    const controller = new AbortController()
    void readWebsiteJson<WebsitePreviewData>('/__website_preview_data', controller.signal)
      .then(async course => {
        if (controller.signal.aborted) return
        setFetchedData(course)
        try {
          const { content } = await readWebsiteJson<{ content: { structureId: number; textMi: string; correct: string; alternative: string; active: boolean }[] }>('/__training_content', controller.signal)
          if (!controller.signal.aborted) setFetchedData({ ...course, sentences: course.sentences.map(sentence => ({ ...sentence, training: content.find(row => row.structureId === sentence.structureId && row.textMi === sentence.textMi) })) })
        } catch {
          if (!controller.signal.aborted) setTrainingError('Practice content is temporarily unavailable. Please try again.')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchError('Course examples are temporarily unavailable.')
      })
    return () => controller.abort()
  }, [connectedLocally, loadAttempt])

  const data = connectedLocally ? localData : fetchedData
  const error = connectedLocally ? localError : fetchError ?? (activeSection.startsWith('#training') ? trainingError : null)

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
    setSelectedLevel(nextLevel)
    setShowLevelOverview(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
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
    if (activeSection !== '#methodology' || !methodologyReady) return
    setMethodStep(0)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setMethodStep(3); return }
    const timers = [1, 2, 3].map(step => window.setTimeout(() => {
      document.getElementById(`method-step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      timers.push(window.setTimeout(() => setMethodStep(step), 850))
    }, 7600 + (step - 1) * 4800))
    return () => timers.forEach(clearTimeout)
  }, [activeSection, methodologyReady])

  if (activeSection.split('?')[0] === '#guess-who') return <GuessWhoGame key={activeSection} />
  if (activeSection.split('?')[0] === '#kitchen') return <KitchenGame key={activeSection} />
  if (activeSection.split('?')[0] === '#live-class') return <LiveClassroom key={activeSection} />
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
            ['#level-finder', 'Methodology', 'Our'],
            ['#competency', 'Capabilities', 'Your'],
            ['#about', 'Us', 'About'],
          ].map(([href, label, prefix]) => {
            const active = activeSection === href || (href === '#level-finder' && ['#teacher', '#account', '#join'].includes(activeSection))
            const journey = `${activeSection}:${navReplay}`
            const showPrefix = !!prefix && active && completedNav === journey
            return <a key={href} href={href} onClick={() => { if (href === '#level-finder') setShowLevelOverview(true); setCompletedNav(''); if (active) setNavReplay(value => value + 1) }} aria-label={prefix ? `${prefix} ${label}` : undefined} aria-current={active ? 'location' : undefined} className={`site-nav-item${active ? ' site-nav-item-active' : ''}`}>
              {prefix ? <span className={`site-nav-prefix${showPrefix ? ' site-nav-prefix-visible' : ''}`} aria-hidden="true"><span style={{ clipPath: `inset(0 0 0 ${ourReveal}%)` }}>{prefix}&nbsp;</span></span> : null}
              <span className="site-nav-anchor">{active ? <NavigationRail key={navReplay} noun={!!prefix} leftWord={prefix} onLeftReveal={setOurReveal} onComplete={() => setCompletedNav(journey)} /> : null}{label}</span>
            </a>
          })}
        </nav>
      </header>

      {activeSection !== '#website-top' && activeSection !== '#about' ? <div className="site-section-navigation">
        <nav aria-label={activeSection === '#competency' ? 'Capabilities sections' : 'Learning sections'}>
          {(activeSection === '#competency' ? [['#competency', 'Team capabilities']] : [
            ['#level-finder', 'Levels'],
          ]).map(([href, label]) => <a key={href} href={href} onClick={() => { if (href === '#level-finder') setShowLevelOverview(true) }} aria-current={activeSection === href ? 'page' : undefined}>{label}</a>)}
        </nav>
      </div> : null}

      {activeSection === '#website-top' ? <main className="site-corporate-welcome" aria-label="Corporate training">
        <div className="site-corporate-offer">
          <p className="site-eyebrow">Te reo Māori for your organisation</p>
          <h1>Your team’s Māori capability.<br />Managed for you.</h1>
          <p className="site-corporate-lead">Fun, interactive classes. Practice between sessions. A clear view of progress. We take care of the coordination.</p>
        </div>
        <figure className="site-corporate-image">
          <img src={corporateHarakeke} width={1536} height={1024} fetchPriority="high" alt="An AI-generated study of interwoven harakeke fibres in natural flax and deep olive tones" />
        </figure>
        <div className="site-offer-stories">
          <section className="site-offer-story">
            <div><h2>Know your team.</h2><p>See what your people can do—and where they need support—in one clear snapshot.</p></div>
            <figure><a href="#competency" aria-label="Explore team capabilities"><img src={offerCapabilities} loading="lazy" alt="Ka Piki team capability dashboard showing skills and individual progress with sample data" /></a><figcaption>Capabilities dashboard · sample data</figcaption></figure>
          </section>
          <section className="site-offer-story site-offer-story-classroom">
            <div><h2>A class to take part in.</h2><p>Talk, play and solve things together. A shared interactive world, not just another video call.</p></div>
            <figure><a href="#classroom" aria-label="Explore the interactive classroom"><img src={offerClassroom} loading="lazy" alt="Ka Piki classroom with a teacher, students, a shared Māori sentence whiteboard and Āe and Kāo activity areas" /></a><figcaption>Interactive classroom · local prototype</figcaption></figure>
          </section>
          <section className="site-offer-story site-offer-story-app">
            <div><h2>Keep learning between classes.</h2><p>Short app practice keeps vocabulary and sentence patterns fresh, around your team’s working day.</p></div>
            <figure><a href="#training" aria-label="Explore the practice app"><img src={offerApp} loading="lazy" alt="Actual Ka Piki practice screen with a visual Māori sentence and two English answer choices" /></a><figcaption>The Ka Piki practice app</figcaption></figure>
          </section>
          <section className="site-offer-story site-offer-story-grammar">
            <div><h2>Deep learning. Simple patterns.</h2><p>Build your command of sentence structures over 50 weeks. Digital rākau make the patterns visible, keeping complex grammatical terminology out of the way.</p></div>
            <figure><a href="#level-finder" aria-label="Explore course levels"><img src={offerGrammar} loading="lazy" alt="Digital rākau show how a WHEN word grows onto a verb alongside noun phrases" /></a><figcaption>Our digital rākau system</figcaption></figure>
          </section>
        </div>
        <p className="site-corporate-closing">You bring the team. We take care of the rest.</p>
      </main> : activeSection === '#about' ? <main id="about" className="site-about" aria-labelledby="site-about-heading">
        <h1 id="site-about-heading">About us</h1>
        <div className="site-about-profile">
          <img className="site-about-portrait" src={directorPortrait} width={1122} height={1402} alt="Peta Kirikiri, Director of Ka Piki" />
          <div className="site-about-copy">
            <h2>Peta Kirikiri</h2>
            <p className="site-about-role">Director</p>
            <div className="site-about-introduction">
              <p>My reo journey began with the Kōhanga Reo initiative. But without a pathway to continue learning in te reo at school, it became a case of use it or lose it.</p>
              <p>Later in life, I returned to university to reconnect with the language, but I struggled. Complex grammar, essays and research felt far removed from what I wanted: to chat, connect with people and feel confident using te reo socially. I knew I was capable, but couldn’t understand why learning felt so difficult.</p>
              <p>That experience made me question traditional teaching methods. I found my way into teaching because I believed I could make the experience easier for others.</p>
              <p>For the past 20 years, my teaching has focused entirely on professional development for government clients. That same aim still guides my work: making te reo easier to learn and use with other people.</p>
              <a className="site-offer-link" href="#level-finder">Our methodology <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </main> : activeSection === '#methodology' ? <section id="methodology" className="site-methodology" aria-label="Methodology">
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
      </section> : <section id="level-finder" className={`site-learning${showLevelOverview ? '' : ' site-level-detail'}`}>
        {!showLevelOverview ? <button type="button" className="level-course-back" onClick={() => setShowLevelOverview(true)}>← All levels</button> : null}
        <header className={`site-level-header${showLevelOverview ? ' site-level-header-overview' : ''}`}>
          <h1>{showLevelOverview ? 'Course levels' : `Level ${selectedLevel}`}</h1>
          {!showLevelOverview ? <button type="button" className="site-level-signup" disabled={data == null} onClick={() => setAccountOpen(true)}>Sign up · Level {selectedLevel}</button> : null}
        </header>
        {showLevelOverview ? <CourseFormat /> : null}
        {error != null ? <div role="alert" className="site-load-error"><p>{error}</p><button type="button" onClick={() => { setFetchError(null); setTrainingError(null); setLoadAttempt(value => value + 1) }}>Try again</button></div> : null}
        {data == null && error == null ? (
          <p role="status" className="site-loading">Loading levels…</p>
        ) : null}

        {data != null ? <>
          <div className="site-level-layout">
            {showLevelOverview ? <LevelCourseOverview sentences={data.sentences} onSelect={changeLevel} /> : <div>
            {selectedLevel === 1 ? <LevelOnePepeha /> : null}
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
            </div>}
          </div>

        </> : null}
      </section>}

      <StudentPortal level={selectedLevel} open={accountOpen} onClose={() => { setAccountOpen(false); if (['#account', '#join'].includes(window.location.hash)) { window.history.replaceState(null, '', window.location.pathname + window.location.search); setActiveSection('#level-finder') } }} />
    </section>
  )
}
