import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import ministryLogo from '../assets/ministry-of-education-logo-white.svg'
import './SiteIdentity.css'
import './MoeOffer.css'
import { MOE_BENEFITS, moeBenefitAction, type MoeBenefitId } from '../lib/moeBenefits'
import MoeBenefitIcon, { type MoeIconId } from './MoeBenefitIcon'
import { MOE_CLASSES, MOE_COURSE_PRICE, MOE_COURSE_INCLUSIONS, moeLevelRoute, moeInterestContext } from '../lib/moeOffer'
import { LEVEL_PRESENTATION } from '../lib/coursePresentation'


export type MoeOfferContent = {
  lead: string
  audience?: string
  learnerClasses?: boolean
  action?: { href: string; label: string }
  benefits: readonly { id: MoeBenefitId; icon?: MoeIconId; label: string; summary: string; group: 'format' | 'support'; action: { href: string; label: string } | null }[]
}
const originalBenefits: MoeOfferContent['benefits'] = MOE_BENEFITS.map(benefit => ({ ...benefit, action: moeBenefitAction(benefit.id) }))

export default function MoeOffer({ onRegister, content }: { onRegister: (level: CurriculumLevel, context: string) => void; content?: MoeOfferContent }) {
  return <main className="moe-offer" aria-labelledby="moe-heading">
    <header className="moe-intro site-card">
      <div className="moe-intro-cover site-card-cover">
        <div className="moe-audience">{content?.audience !== '' && <span>{content?.audience ?? 'For staff at'}</span>}<img className="moe-ministry-logo" src={ministryLogo} width={200} height={58} alt="Te Tāhuhu o te Mātauranga | Ministry of Education" /></div>
        <div className="moe-intro-main">
          <div className="moe-intro-copy">
            <h1 id="moe-heading">Te reo Māori classes</h1>
            <p className="moe-lead">{content?.lead ?? 'A complete learning programme for your team. Live teaching, bespoke digital activities, stories and games, with resources, app practice and progress support built in.'}</p>
            <aside className="moe-policy-message"><strong>Te reo Māori classes for the MOE network</strong><span>The Policy Group has been hosting te reo Māori classes for the past 10 years and has developed six levels for students. These classes are now open to anyone within the MOE network.</span><span>Please check the levels and schedule below, choose the level that suits you, and sign up.</span><span>Please forward any further questions to Esther Boyle.</span><span>Contact: <a href="mailto:Esther.Boyle@education.govt.nz">Esther.Boyle@education.govt.nz</a></span></aside>
          <div className="moe-course-price"><strong>{MOE_COURSE_PRICE}</strong><span>Same price for every course.</span><p>{MOE_COURSE_INCLUSIONS}</p></div>
          <a className="moe-offer-jump" href={content?.action?.href ?? '#moe?timetable'}>{content?.action?.label ?? 'Find your class'}</a></div>
          <div className="moe-start"><span>Starts Monday</span><time dateTime="2026-10-12"><strong>12 October</strong><span>2026</span></time></div>
        </div>
      </div>
      {(['format', 'support'] as const).map(group => <ul key={group} className={`moe-facts${group === 'support' ? ' moe-support' : ''}`} aria-label={group === 'format' ? content ? 'What you will gain' : 'Course format' : 'Included learning support'}>
        {(content?.benefits ?? originalBenefits).filter(benefit => benefit.group === group).map(benefit => { const action = benefit.action; return <li key={benefit.id}>
          <span className="moe-benefit-icon" aria-hidden="true"><MoeBenefitIcon id={benefit.icon ?? benefit.id} /></span>
          <div className="moe-benefit-copy">
            <h2>{benefit.label}</h2><p>{benefit.summary}</p>
            {action ? <a className="moe-benefit-button" href={action.href}>{action.label}</a> : null}
          </div>
        </li> })}
      </ul>)}
    </header>
    <MoeTimetable onRegister={onRegister} learnerFocus={content?.learnerClasses} />
  </main>
}

export function MoeTimetable({ onRegister, learnerFocus = false }: { onRegister: (level: CurriculumLevel, context: string) => void; learnerFocus?: boolean }) {
  return <section id="moe-timetable" className={learnerFocus ? 'moe-timetable-learner' : undefined} aria-label="Class timetable">
      <div className="moe-timetable">
        {MOE_CLASSES.map(({ day, startDate, sessions }) => <section key={day} className="site-card moe-day" aria-label={`${day} classes`}>
          <header className="site-card-cover moe-day-heading"><h3 className="site-card-title">{day}</h3><p>From {startDate}</p></header>
          <div className="moe-day-sessions">{sessions.map(({ level, time, title }) => <article key={level} id={`moe-class-${level}`} className={`moe-session moe-session-${level}`} aria-label={`${title}, ${day}, ${time}`}>
            <p className="moe-time">{time}</p>
            <div className="moe-session-title"><span className="moe-level-number" aria-hidden="true">{level}</span><div><h4>{learnerFocus ? LEVEL_PRESENTATION[level].title : title}</h4>{learnerFocus || level === 6 ? <span className="moe-club-level">Level {level}</span> : null}</div></div>
            <ul className="moe-session-skills" aria-label={`Level ${level} skills`}>{LEVEL_PRESENTATION[level].skills.map(skill => <li key={skill.label}><strong>{skill.label}</strong><span>{skill.pattern}</span></li>)}</ul>
            <p className="moe-session-price">{MOE_COURSE_PRICE}</p>
            <a className="moe-description-button" href={moeLevelRoute(level)} aria-label={learnerFocus ? `Explore Level ${level} content` : `Level description for ${title}`}>{learnerFocus ? 'Explore the content' : 'Level description'}</a>
            <button type="button" onClick={() => onRegister(level, moeInterestContext(level))} aria-label={`Register interest in ${title}`}>Register interest</button>
          </article>)}</div>
        </section>)}
      </div>
    </section>
}
