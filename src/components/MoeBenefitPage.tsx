import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { normaliseWebsiteHash } from '../lib/websiteRoutes'
import { type MoeBenefit, type MoeBenefitId } from '../lib/moeBenefits'
import MoeBenefitIcon, { type MoeIconId } from './MoeBenefitIcon'
import TrainingView from './TrainingView'
import CourseCertificate from './CourseCertificate'
import type { WebsitePreviewData } from './WebsiteView'
import { trainingExamples, trainingAlternative } from '../lib/trainingProgression'
import appScreen from '../assets/offer-app-taniko.png'
import classroomScreen from '../assets/offer-classroom.png'
import guessWhoScreen from '../assets/showcase-guess-who.png'
import kitchenScreen from '../assets/showcase-kitchen.png'
import syllabusScreen from '../assets/showcase-digital-syllabus.png'
import './SiteIdentity.css'
import './TrainingIdentity.css'
import './MoeBenefitPage.css'

const IntakeContext = createContext(true)
function OfferLink({ href, ...props }: ComponentProps<'a'>) {
  const moe = useContext(IntakeContext)
  const destination = moe || !href?.startsWith('#moe') ? href
    : href === '#moe/levels' || href.startsWith('#moe?') || href === '#moe' ? '#level-finder'
    : href.replace('#moe/', '#')
  return <a {...props} href={destination?.startsWith('#') ? normaliseWebsiteHash(destination) : destination} />
}

function IconTile({ id }: { id: MoeIconId }) {
  return <span className="moe-proof-icon"><MoeBenefitIcon id={id} /></span>
}

function Highlight({ id, title, children }: { id: MoeIconId; title: string; children: ReactNode }) {
  return <li><IconTile id={id} /><div><h2>{title}</h2><p>{children}</p></div></li>
}

const SCENES = [
  { image: classroomScreen, title: 'Virtual classroom', alt: 'Ka Piki virtual classroom with a Māori sentence board and learner avatars', text: 'Listen, respond and build sentences with your teacher and classmates.', icon: 'live-classes' },
  { image: guessWhoScreen, title: 'Guess Who', alt: 'Ka Piki Guess Who with characters to describe and identify', text: 'Ask questions and use clues to identify the secret person.', icon: 'student-management' },
  { image: kitchenScreen, title: 'In the kitchen', alt: 'Ka Piki cooking game with shared orders, ingredients and player chefs', text: 'Ask for ingredients, share tasks and complete orders together.', icon: 'game' },
] as const

function SceneGallery({ gamesOnly = false }: { gamesOnly?: boolean }) {
  return <div className={`moe-proof-gallery${gamesOnly ? ' moe-proof-gallery-pair' : ''}`}>
    {SCENES.slice(gamesOnly ? 1 : 0).map(scene => <figure key={scene.title}>
      <img src={scene.image} alt={scene.alt} loading="lazy" />
      <figcaption><IconTile id={scene.icon} /><div><h2>{scene.title}</h2><p>{scene.text}</p></div></figcaption>
    </figure>)}
  </div>
}

function Syllabus() {
  return <div className="moe-syllabus-showcase">
    <div className="moe-syllabus-screen">
      <img src={syllabusScreen} alt="The digital syllabus in use: sentence structures, reading and practice tabs, with a worked Māori sentence, coloured rākau, English meaning and an expanded explanation." />
    </div>
    <ul className="moe-proof-highlights moe-syllabus-features">
      <Highlight id="digital-syllabus" title="Find the pattern">Sentence structures organised by level.</Highlight>
      <Highlight id="bespoke-activities" title="See how it works">Worked examples with visual rākau and meaning.</Highlight>
      <Highlight id="app" title="Return and practise">Keep your course material close between classes.</Highlight>
    </ul>
  </div>
}

function AppDemonstration({ data, error }: { data?: WebsitePreviewData | null; error?: string | null }) {
  const examples = trainingExamples(data?.sentences ?? []).filter((item, index, all) => item.sentence.training?.active === true && trainingAlternative(all, index) != null)
  const ready = new Set(examples.map(item => item.meaning.toLocaleLowerCase())).size >= 2
  return <div className="moe-app-demonstration">
    {ready ? <div className="training-app moe-app-live">
      <div className="site-card-cover moe-app-bar"><strong>KA PIKI</strong><span>Practice</span></div>
      <TrainingView preview data={data} sentenceSize="fit" />
    </div> : <figure className="moe-app-capture">
      <img src={appScreen} alt="Ka Piki practice app: a Māori sentence with coloured rākau above two English answer choices" />
      <figcaption>{error ? 'Live practice is temporarily unavailable. This is the app screen.' : 'App screen preview'}</figcaption>
    </figure>}
    {ready ? <p className="moe-app-invitation">Choose a meaning. Try the next sentence.</p> : null}
  </div>
}

function Proof({ id, practiceData, practiceError }: { id: MoeBenefitId; practiceData?: WebsitePreviewData | null; practiceError?: string | null }) {
  switch (id) {
    case 'capability-reference': return <ul className="moe-proof-highlights">
      <Highlight id="conversation" title="Comfortable">Use familiar language in predictable exchanges and prepared introductions.</Highlight>
      <Highlight id="conversation" title="Confident">Use familiar language flexibly in routine conversations.</Highlight>
      <Highlight id="conversation" title="Capable">Contribute spontaneously to general conversation, including some unfamiliar situations.</Highlight>
    </ul>
    case 'learning-support':
    case 'app': return <AppDemonstration data={practiceData} error={practiceError} />
    case 'professional-learning': return <ul className="moe-proof-highlights">
      <Highlight id="conversation" title="Introductions">Talk about yourself, your people and the places you belong.</Highlight>
      <Highlight id="conversation" title="Conversations">Describe past, present and future actions, and give instructions.</Highlight>
      <Highlight id="ideas" title="Ideas and opinions">Build towards comparing ideas, explaining what is possible and asking questions.</Highlight>
    </ul>
    case 'course-certificate': return <>
      <CourseCertificate />
      <div className="moe-certificate-notes">
        <p>Add your course achievement to your CV and LinkedIn.</p>
        <OfferLink href="#moe/benefits/capability-reference">About the capability framework</OfferLink>
      </div>
    </>
    case 'everyday-reo': return <ul className="moe-proof-highlights">
      <Highlight id="conversation" title="Introduce yourself">Talk about yourself, your people and your connections.</Highlight>
      <Highlight id="conversation" title="Talk about your day">Build from introductions into past, present and future actions.</Highlight>
      <Highlight id="conversation" title="Express more">Progress towards giving instructions, comparing ideas and asking questions.</Highlight>
    </ul>
    case 'live-classes':
    case 'bespoke-activities': return <SceneGallery />
    case 'digital-syllabus': return <Syllabus />
    case 'stories-games': return <>
      <OfferLink className="moe-proof-reading" href="#moe/levels/1?tab=stories">
        <IconTile id="digital-syllabus" /><div><h2>Pepeha</h2><p>A Level 1 worked introduction through places, whānau, work and home.</p><span>Read the pepeha ↗</span></div>
      </OfferLink>
      <SceneGallery gamesOnly />
    </>
    default: return null
  }
}

const DETAILS = {
  'capability-reference': { intro: 'The Māori Crown Relations Capability Framework gives public-service agencies a shared language for development. Its capability bands are separate from Ka Piki’s six course levels; course completion alone does not establish a framework rating.', href: 'https://www.tpk.govt.nz/pages/download/pages-3013-A/TA013.03-MCR-capability-Individual-Capacity-Component.pdf', action: 'Read the framework (PDF)' },
  'learning-support': { intro: 'Try a practice round. Your answers here are not saved.', href: '#moe/practice', action: 'Keep practising' },
  'professional-learning': { intro: 'Choose a level that builds on what you can already say, from introducing yourself to expressing ideas in conversation.', href: '#moe/levels', action: 'Explore the levels' },
  'course-certificate': { intro: 'Recognise your learning with a Ka Piki certificate on passing your course.', href: '#moe?timetable', action: 'Find your class' },
  'everyday-reo': { intro: 'Choose the level that builds on what you can already say, then extend the language you use in life and work.', href: '#moe/levels', action: 'Explore the levels' },
  app: { intro: 'Try a practice round. Your answers here are not saved.', href: '#moe/practice', action: 'Keep practising' },
  'live-classes': { intro: 'You don’t have to learn on your own. Make time each week to speak, ask questions and practise with your teacher and classmates.', href: '#moe?timetable', action: 'View class times' },
  'digital-syllabus': { intro: 'You don’t have to remember everything from class. Come back to a sentence pattern or worked example whenever you need a reminder.', href: '#moe/levels/2?tab=structures', action: 'Open the syllabus' },
  'bespoke-activities': { intro: 'Give your reo a job to do. Ask a question, solve a problem or help your team, with a shared goal that gives you a reason to speak.', href: '#moe/benefits/live-classes', action: 'See live classes' },
  'stories-games': { intro: 'Find something to enjoy in te reo, not just something to study. Read a story at your own pace or put your language to use in a game with others.', href: '#moe/levels/1?tab=stories', action: 'Read the Level 1 pepeha' },
} as const

export default function MoeBenefitPage({ benefit, moe = true, practiceData, practiceError }: { benefit: MoeBenefit; moe?: boolean; practiceData?: WebsitePreviewData | null; practiceError?: string | null }) {
  const detail = DETAILS[benefit.id as keyof typeof DETAILS]
  if (!detail) return null
  return <IntakeContext value={moe}><main className="moe-benefit-page" aria-labelledby="moe-benefit-heading">
    <section className="site-card moe-proof-card">
      <header className="site-card-cover moe-proof-header">
        <MoeBenefitIcon id={benefit.id} />
        <div><h1 id="moe-benefit-heading">{benefit.label}</h1><p className="site-benefit-intro">{detail.intro}</p></div>
      </header>
      <div className="moe-proof-body"><Proof id={benefit.id} practiceData={practiceData} practiceError={practiceError} /></div>
      <footer className="moe-proof-footer">
        <OfferLink className="moe-proof-return" href="#moe">{moe ? 'October intake' : 'Course levels'}</OfferLink>
        <OfferLink className="moe-feature-button" href={detail.href}>{!moe && benefit.id === 'live-classes' ? 'View course levels' : detail.action}</OfferLink>
      </footer>
    </section>
  </main></IntakeContext>
}
