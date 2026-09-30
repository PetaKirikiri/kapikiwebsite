import { readWebsiteJson } from '../lib/websiteData'
import { readWebsiteCourse, subscribeToWebsiteCourse } from '../lib/websiteCourseData'
import LevelCourseOverview from './LevelCourseOverview'
import CourseFormat from './CourseFormat'
import MoeOffer from './MoeOffer'
import MoeOfferV2 from './MoeOfferV2'
import MoeBenefitPage from './MoeBenefitPage'
import { websiteRoute, contextualRoute, normaliseWebsiteHash } from '../lib/websiteRoutes'
import { moeInterestContext } from '../lib/moeOffer'
import LevelOnePepeha, { LevelReadingMaterial } from './LevelOnePepeha'
import { LEVEL_READING_MATERIAL } from '../lib/levelReadingMaterial'
import { LEVEL_READING_ANNOTATIONS } from '../lib/levelReadingAnnotations'
import LevelExplorer from './LevelExplorer'
import { installWebsiteNavigation } from '../lib/websiteNavigation'
import KitchenGame from './KitchenGame'
import GuessWhoGame from './GuessWhoGame'
import LiveClassroom from './LiveClassroom'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { BusManifestSheet } from '../lib/busManifestContract'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { ReviewDeskPosCatalog, SavedBusManifest } from '../lib/busManifestTeam/reviewDeskGateway'
import type { BusManifestUserWrite } from './BusManifestReviewView'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { unresolvedSentence as blankSheet } from '../lib/connectorPresentation/engine'
import './WebsiteView.css'
import './SiteIdentity.css'
import CapabilitiesDashboard from './CapabilitiesDashboard'
import StudentPortal from './studentPortal/StudentPortal'
import SentenceTranslation from './SentenceTranslation'
import TrainingView from './TrainingView'
import TrainingNavigation from './TrainingNavigation'
import TrainingAdmin from './TrainingAdmin'
import KaPikiWordmark from './KaPikiWordmark'
import NavigationRail from './NavigationRail'
import ClassroomRoom from './ClassroomRoom'
import corporateHarakeke from '../assets/corporate-harakeke-v1.jpg'
import offerCapabilities from '../assets/offer-capabilities.png'
import offerClassroom from '../assets/offer-classroom.png'
import offerApp from '../assets/offer-app-taniko.png'
import offerGrammar from '../assets/offer-grammar.png'
import directorPortrait from '../assets/peta-kirikiri-portrait-v5.png'
import ministryLogo from '../assets/ministry-of-education-logo-white.svg'

const LevelVocabulary = lazy(() => import('./LevelVocabulary'))

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
  readonly intakeVersion?: 1 | 2
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
  return normaliseWebsiteHash(section)
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
  intakeVersion = 2,
  localData,
  localError = null,
}: WebsiteViewProps = {}) {
  const connectedLocally = localData !== undefined
  const [fetchedData, setFetchedData] = useState<WebsitePreviewData | null>(null)
  const [trainingContent, setTrainingContent] = useState<readonly (NonNullable<WebsitePreviewSentence['training']> & { structureId: number; textMi: string })[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [trainingError, setTrainingError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [localStates, setLocalStates] = useState<ReadonlyMap<number, BusManifestSheet>>(new Map())
  const [navReplay, setNavReplay] = useState(0)
  const [completedNav, setCompletedNav] = useState('')
  const [ourReveal, setOurReveal] = useState(100)
  const [selectedLevel, setSelectedLevel] = useState<CurriculumLevel>(() => websiteRoute(window.location.hash).level ?? 1)
  const [showLevelOverview, setShowLevelOverview] = useState(() => !websiteRoute(window.location.hash).level)
  const [interestContext, setInterestContext] = useState('')
  const [accountOpen, setAccountOpen] = useState(() => ['#account', '#join'].includes(websiteRoute(window.location.hash).surface))
  const [activeSection, setActiveSection] = useState(currentWebsiteSection)
  const route = websiteRoute(activeSection)
  const moeRoute = route.moe
  const moeBenefit = route.benefit
  const surface = route.surface
  const link = (path: string) => contextualRoute(moeRoute, path)
  const registrationContext = moeRoute ? moeInterestContext(selectedLevel) : interestContext
  const Offer = intakeVersion === 2 ? MoeOfferV2 : MoeOffer
  useEffect(() => installWebsiteNavigation(section => {
    setActiveSection(section)
    setInterestContext('')
    const next = websiteRoute(section)
    setShowLevelOverview(!next.level)
    if (next.level) setSelectedLevel(next.level)
    setAccountOpen(['#account', '#join'].includes(next.surface))
    if (['#account', '#join'].includes(next.surface)) setSelectedLevel(1)
  }), [])

  useEffect(() => {
    if (connectedLocally) return
    let active = true
    const unsubscribe = subscribeToWebsiteCourse(course => {
      if (active) { setFetchedData(course); setFetchError(null) }
    })
    void readWebsiteCourse().then(course => {
      if (active) { setFetchedData(course); setFetchError(null) }
    }).catch(() => {
      if (active) setFetchError('Course examples are temporarily unavailable.')
    })
    return () => { active = false; unsubscribe() }
  }, [connectedLocally, loadAttempt])

  useEffect(() => {
    if (connectedLocally) return
    const controller = new AbortController()
    // Independent of the course read: practice must not extend the lesson waterfall.
    void readWebsiteJson<{ content: typeof trainingContent }>('/__training_content', controller.signal)
      .then(({ content }) => { if (!controller.signal.aborted) { setTrainingContent(content); setTrainingError(null) } })
      .catch(() => { if (!controller.signal.aborted) setTrainingError('Practice content is temporarily unavailable. Please try again.') })
    return () => controller.abort()
  }, [connectedLocally, loadAttempt])

  const data = useMemo(() => {
    if (connectedLocally) return localData
    if (!fetchedData) return null
    return { ...fetchedData, sentences: fetchedData.sentences.map(sentence => ({
      ...sentence, training: trainingContent.find(row => row.structureId === sentence.structureId && row.textMi === sentence.textMi),
    })) }
  }, [connectedLocally, localData, fetchedData, trainingContent])
  const error = connectedLocally ? localError : fetchError ?? ((surface === '#practice' || (route.level && route.tab === 'practice') || activeSection.startsWith('#training')) ? trainingError : null)

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
    window.location.assign(link(`#levels/${nextLevel}`))
  }
  useEffect(() => {
    const current = websiteRoute(activeSection)
    document.title = `${current.notFound ? 'Page not found' : current.level ? `Level ${current.level}` : current.benefit?.label ?? (current.overview ? 'Course levels' : current.surface === '#moe' ? 'October intake' : current.surface === '#competency' ? 'Team capabilities' : current.surface === '#about' ? 'About us' : current.surface === '#practice' ? 'Practice preview' : 'Te reo Māori')} · ${current.moe ? 'MOE · ' : ''}Ka Piki`
  }, [activeSection, intakeVersion])

  const levelSentences = data?.sentences.filter((sentence) => sentence.curriculumLevel === selectedLevel) ?? []
  const courseOrderByStructureId = useMemo(() => {
    const ordered = data?.sentences
      .filter((sentence) => sentence.curriculumLevel != null)
      .slice()
      .sort((left, right) => (left.curriculumLevel! - right.curriculumLevel!) || (left.sortOrder - right.sortOrder)) ?? []
    return new Map(ordered.map((sentence, index) => [sentence.structureId, index]))
  }, [data])

  if (activeSection.split('?')[0] === '#kitchen') return <KitchenGame key={activeSection} />
  if (activeSection.split('?')[0] === '#guess-who') return <GuessWhoGame key={activeSection} />
  if (activeSection.split('?')[0] === '#live-class') return <LiveClassroom key={activeSection} />
  if (activeSection === '#classroom' || activeSection === '#classroom-2d') return <ClassroomRoom data={data} error={error} />
  if (activeSection === '#training' || activeSection === '#training-admin') {
    return <main className="training-app" aria-label="Ka Piki training app">
      <TrainingNavigation />
      {activeSection === '#training-admin' ? <TrainingAdmin data={data} error={error} /> : <TrainingView data={data} error={error} />}
    </main>
  }

  return (
    <section id="website-top" aria-label="Website" data-testid="website-workspace" className="maori-site">
      <button type="button" className="site-skip-content" onClick={() => {
        const main = document.querySelector<HTMLElement>('.maori-site main')
        if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); main.scrollIntoView({ block: 'start' }) }
      }}>Skip to content</button>
      <header className={`site-header${moeRoute ? ' site-header-moe' : ''}`}>
        <div className="site-header-branding">
        <a href={moeRoute ? '#moe' : '#website-top'} className="site-wordmark" aria-label="Ka Piki"><KaPikiWordmark /></a>
        {moeRoute ? <a href="#moe" className="site-moe-home" aria-label="Ka Piki October intake for Ministry of Education staff" aria-current={activeSection === '#moe' ? 'page' : undefined}>
          <img src={ministryLogo} width={150} height={44} alt="Ministry of Education" />
        </a> : null}
        </div>
        <nav aria-label="Website navigation" className="site-nav">
          {[
            ['#level-finder', 'Levels', ''],
            ['#competency', 'Capabilities', 'Your'],
            ['#about', 'About', ''],
          ].map(([href, label, prefix]) => {
            const learnerCapabilities = intakeVersion === 2 && href === '#competency'
            const active = (learnerCapabilities ? route.benefit?.id === 'capability-reference' : surface === href) || (href === '#level-finder' && (route.overview || !!route.level))
            const journey = `${activeSection}:${navReplay}`
            const showPrefix = !!prefix && active && completedNav === journey
            return <a key={href} href={link(learnerCapabilities ? '#benefits/capability-reference' : href)} onClick={() => { if (href === '#level-finder') setShowLevelOverview(true); setCompletedNav(''); if (active) setNavReplay(value => value + 1) }} aria-label={prefix ? `${prefix} ${label}` : undefined} aria-current={active ? 'location' : undefined} className={`site-nav-item${active ? ' site-nav-item-active' : ''}`}>
              {prefix ? <span className={`site-nav-prefix${showPrefix ? ' site-nav-prefix-visible' : ''}`} aria-hidden="true"><span style={{ clipPath: `inset(0 0 0 ${ourReveal}%)` }}>{prefix}&nbsp;</span></span> : null}
              <span className="site-nav-anchor">{active ? <NavigationRail key={navReplay} noun={!!prefix} leftWord={prefix} onLeftReveal={setOurReveal} onComplete={() => setCompletedNav(journey)} /> : null}{label}</span>
            </a>
          })}
        </nav>
      </header>


      {route.notFound ? <main className="moe-benefit-page"><h1>Page not found</h1><a className="moe-feature-button" href={moeRoute ? '#moe' : '#website-top'}>{moeRoute ? 'Back to MOE classes' : 'Back to Ka Piki'}</a></main> : surface === '#practice' ? <main className="training-app site-practice-preview"><a className="site-context-return" href={link('#benefits/app')}>Back to app overview</a><h1>Try the practice app</h1><p className="site-preview-label">Preview · answers stay in this session</p><TrainingView preview data={data} error={error} /></main> : moeBenefit ? <MoeBenefitPage key={`${moeRoute}:${moeBenefit.id}`} benefit={moeBenefit} moe={moeRoute} practiceData={data} practiceError={error ?? trainingError} /> : surface === '#moe' ? <Offer onRegister={(level, context) => { setSelectedLevel(level); setInterestContext(context); setAccountOpen(true) }} /> : activeSection === '#website-top' ? <main className="site-corporate-welcome" aria-label="Corporate training">
        <div className="site-corporate-offer">
          <h1>Build your team’s Māori capability.<br />Without the extra workload.</h1>
          <p className="site-corporate-lead">Practical learning for staff. Clear oversight for you. Managed by us.</p>
        </div>
        <figure className="site-corporate-image">
          <img src={corporateHarakeke} width={1536} height={1024} fetchPriority="high" alt="An AI-generated study of interwoven harakeke fibres in natural flax and deep olive tones" />
        </figure>
        <div className="site-offer-stories">
          <section className="site-offer-story">
            <div><h2>Know your team.</h2><p>See what your people can do—and where they need support—in one clear snapshot.</p></div>
            <figure><a href="#competency" aria-label="Explore team capabilities"><img src={offerCapabilities} loading="lazy" alt="Ka Piki team capability dashboard showing skills and individual progress with sample data" /></a><a className="site-offer-link" href="#competency">Your capabilities</a></figure>
          </section>
          <section className="site-offer-story site-offer-story-classroom">
            <div><h2>A class to take part in.</h2><p>Talk, play and solve things together. A shared interactive world, not just another video call.</p></div>
            <figure><a href="#live-classes" aria-label="Explore the interactive classroom"><img src={offerClassroom} loading="lazy" alt="Ka Piki classroom with a teacher, students, a shared Māori sentence whiteboard and Āe and Kāo activity areas" /></a><a className="site-offer-link" href="#live-classes">Explore the classroom</a></figure>
          </section>
          <section className="site-offer-story site-offer-story-app">
            <div><h2>Keep learning between classes.</h2><p>Short app practice keeps vocabulary and sentence patterns fresh, around your team’s working day.</p></div>
            <figure><a href="#app-showcase" aria-label="Explore the practice app"><img src={offerApp} loading="lazy" alt="Actual Ka Piki practice screen with a visual Māori sentence and two English answer choices" /></a><a className="site-offer-link" href="#app-showcase">Explore the app</a></figure>
          </section>
          <section className="site-offer-story site-offer-story-grammar">
            <div><h2>Deep learning. Simple patterns.</h2><p>Build your command of sentence structures, one course at a time. Digital rākau make the patterns visible, keeping complex grammatical terminology out of the way.</p></div>
            <figure><a href={link('#level-finder')} aria-label="Explore course levels"><img src={offerGrammar} loading="lazy" alt="Digital rākau show how a WHEN word grows onto a verb alongside noun phrases" /></a><a className="site-offer-link" href={link('#level-finder')}>Explore the levels</a></figure>
          </section>
        </div>
        <p className="site-corporate-closing">You bring the team. We take care of the rest.</p>
      </main> : surface === '#about' ? <main id="about" className="site-about" aria-labelledby="site-about-heading">
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
              <a className="site-offer-link" href={link('#level-finder')}>Explore the levels</a>
            </div>
          </div>
        </div>
      </main> : surface === '#competency' ? <main id="competency" className="site-methodology" aria-label="Capabilities">
        <CapabilitiesDashboard />
      </main> : <main id="level-finder" className={`site-learning${showLevelOverview ? '' : ' site-level-detail'}${moeRoute ? ' moe-level-page' : ''}`}>
        {showLevelOverview ? <header className="site-card site-card-cover site-level-header site-level-header-overview"><h1>Course levels</h1><p className="site-benefit-intro">Start with what you already know and see what you could do next. Each level builds on the language you have made your own.</p></header> : null}
        {showLevelOverview && !moeRoute ? <CourseFormat linked /> : null}
        {error != null ? <div role="alert" className="site-load-error"><p>{error}</p><button type="button" onClick={() => { setFetchError(null); setTrainingError(null); setLoadAttempt(value => value + 1) }}>Try again</button></div> : null}
        <div id="course-levels" className="site-level-layout">
          {showLevelOverview ? <LevelCourseOverview sentences={data?.sentences} onSelect={changeLevel} /> : <LevelExplorer level={selectedLevel} moe={moeRoute} tab={route.tab} onRegister={() => setAccountOpen(true)}>
            {route.tab === 'structures' ? <>
              {data == null && error == null ? <div className="site-lesson-loading" role="status" aria-label="Loading lesson examples"><span /><span /><span /></div> : null}
              {data ? <>
                <div className="site-sentence-panel"><div className="site-sentences" aria-label={`Level ${selectedLevel} sentence structures`}>
                  {levelSentences.length === 0 ? <p>No sentence structures assigned to this level yet.</p> : <FamilyConnectorSentenceView
                    key={selectedLevel} loading={false}
                    paragraphs={levelSentences.map(sentence => renderUnassessedPassage(sentence.textMi))}
                    savedBusManifests={levelSentences.map(sentence => demoManifest(sentence, states.get(sentence.structureId) ?? blankSheet(sentence.textMi), courseOrderByStructureId.get(sentence.structureId) ?? sentence.sortOrder))}
                    posCatalog={data.catalog} passageAddresses={levelSentences.map(sentence => ({ structureId: sentence.structureId }))}
                    onBusManifestWrite={handleLocalWrite} showPassageSearch={false} showPassageLabel={false}
                    showStructureNotes collapsibleStructureNotes
                    renderPassageSupplement={(index, materials, joins) => <SentenceTranslation text={levelSentences[index]!.textMi} materials={materials} joins={joins} />}
                    readOnly />}
                </div></div>
              </> : null}
            </> : route.tab === 'vocabulary' ? <Suspense fallback={<p role="status">Loading vocabulary…</p>}><LevelVocabulary key={selectedLevel} level={selectedLevel} catalog={data?.catalog} /></Suspense> : route.tab === 'stories' ? selectedLevel === 1
              ? <LevelOnePepeha catalog={data?.catalog} sentences={data?.sentences} moe={route.moe} />
              : <LevelReadingMaterial key={selectedLevel} reading={LEVEL_READING_MATERIAL[selectedLevel]} catalog={data?.catalog} sentences={LEVEL_READING_ANNOTATIONS} moe={route.moe} /> : <>
              <p className="site-preview-label">Level {selectedLevel} practice · answers stay in this session</p>
              <TrainingView key={selectedLevel} preview data={data ? { ...data, sentences: levelSentences } : null} error={error ?? trainingError} />
            </>}
          </LevelExplorer>}

        </div>
      </main>}

      <StudentPortal key={`${accountOpen}:${registrationContext || selectedLevel}`} context={registrationContext} level={selectedLevel} open={accountOpen} onClose={() => { setAccountOpen(false); if (['#account', '#join'].includes(websiteRoute(window.location.hash).surface)) { window.location.hash = moeRoute ? '#moe' : '#level-finder' } }} />
    </section>
  )
}
