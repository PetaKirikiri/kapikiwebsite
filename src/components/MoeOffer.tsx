import { CoursePreviewExample } from './CourseSkillExample'
import type { WebsitePreviewData } from './WebsiteView'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import ministryLogo from '../assets/ministry-of-education-logo-white.svg'
import './SiteIdentity.css'
import './MoeOffer.css'
import { MOE_BENEFITS, moeBenefitAction, type MoeBenefitId } from '../lib/moeBenefits'
import MoeBenefitIcon, { type MoeIconId } from './MoeBenefitIcon'
import { MOE_CLASSES, MOE_COURSE_PRICE_AMOUNT, MOE_COURSE_PRICE, moeLevelRoute, moeInterestContext } from '../lib/moeOffer'
import { LEVEL_PRESENTATION } from '../lib/coursePresentation'


export type MoeOfferContent = {
  lead: string
  audience?: string
  learnerClasses?: boolean
  action?: { href: string; label: string }
  benefits: readonly { id: MoeBenefitId; icon?: MoeIconId; label: string; summary: string; group: 'format' | 'support'; action: { href: string; label: string } | null }[]
}
const originalBenefits: MoeOfferContent['benefits'] = MOE_BENEFITS.map(benefit => ({ ...benefit, action: moeBenefitAction(benefit.id) }))

const COURSE_PREVIEWS: Record<CurriculumLevel, { textMi: string; textEn: string }> = {
  1: { textMi: 'Nō Rotorua ahau.', textEn: 'I am from Rotorua.' },
  2: { textMi: 'Kei te pānui ahau i te pukapuka.', textEn: 'I am reading the book.' },
  3: { textMi: 'Kāore anō au kia horoi i ngā huawhenua.', textEn: 'I have not washed the vegetables yet.' },
  4: { textMi: 'Nā Hana te hui i whakarite.', textEn: 'Hana organised the meeting.' },
  5: { textMi: 'Ka taea e Hana te pouaka te kawe.', textEn: 'Hana can carry the box.' },
  6: { textMi: 'Nōnahea koutou i whakarite ai i te mahere?', textEn: 'When did you prepare the plan?' },
}

export default function MoeOffer({ onRegister, content, courseData }: { courseData?: WebsitePreviewData | null; onRegister: (level: CurriculumLevel, context: string) => void; content?: MoeOfferContent }) {
  return <main className="moe-offer" aria-labelledby="moe-heading">
    <header className="moe-intro site-card">
      <div className="moe-intro-cover site-card-cover">
        <div className="moe-audience">{content?.audience !== '' && <span>{content?.audience ?? 'For staff at'}</span>}<img className="moe-ministry-logo" src={ministryLogo} width={200} height={58} alt="Te Tāhuhu o te Mātauranga | Ministry of Education" /></div>
        <div className="moe-intro-main">
          <div className="moe-intro-copy">
            <h1 id="moe-heading">Te reo Māori classes</h1>
            <p className="moe-lead">{content?.lead ?? 'A complete learning programme for your team. Live teaching, bespoke digital activities, stories and games, with resources, app practice and progress support built in.'}</p>
            <a className="moe-offer-jump" href={content?.action?.href ?? '#moe?timetable'}>Find your level <span aria-hidden="true">→</span></a>
          </div>
          <div className="moe-intake-details" aria-label="Course dates, cost and commitment">
            <p><span>Starts</span><strong><time dateTime="2026-10-12">12 October 2026</time></strong></p>
            <p><span>Every course</span><strong>{MOE_COURSE_PRICE}</strong></p>
            <p><strong>1 hour weekly · 10 weeks</strong><span>10 hours live online, plus app access</span></p>
          </div>
        </div>
      </div>
      {(['format'] as const).map(group => <ul key={group} className="moe-facts" aria-label={content ? 'What you will gain' : 'Course format'}>
        {(content?.benefits ?? originalBenefits).filter(benefit => benefit.group === group).map(benefit => { const action = benefit.action; return <li key={benefit.id}>
          <span className="moe-benefit-icon" aria-hidden="true"><MoeBenefitIcon id={benefit.icon ?? benefit.id} /></span>
          <div className="moe-benefit-copy">
            <h2>{benefit.label}</h2><p>{benefit.summary}</p>
            {action ? <a className="moe-benefit-button" href={action.href}>{action.label}</a> : null}
          </div>
        </li> })}
      </ul>)}
        <ul className="moe-facts moe-support" aria-label="Class format and app access">
          {(content?.benefits ?? originalBenefits).filter(benefit => benefit.group === 'support' && (!content?.learnerClasses || benefit.id !== 'live-classes')).map(benefit => <li key={benefit.id}>
            <span className="moe-benefit-icon" aria-hidden="true"><MoeBenefitIcon id={benefit.icon ?? benefit.id} /></span>
            <div className="moe-benefit-copy"><h2>{benefit.label}</h2><p>{benefit.summary}</p>
              {benefit.action ? <a className="moe-benefit-button" href={benefit.action.href}>{benefit.action.label}</a> : null}
            </div>
          </li>)}
        </ul>
    </header>
    <MoeTimetable courseData={courseData} onRegister={onRegister} learnerFocus={content?.learnerClasses} />
            <aside className="moe-policy-message moe-course-contact" aria-label="About these classes and contact"><strong>Te reo Māori classes for the MOE network</strong><span>The Policy Group has been hosting te reo Māori classes for the past 10 years and has developed six levels for students. These classes are now open to anyone within the MOE network.</span><span>Please forward any further questions to Esther Boyle.</span><span>Contact: <a href="mailto:Esther.Boyle@education.govt.nz">Esther.Boyle@education.govt.nz</a></span></aside>
  </main>
}

export function MoeTimetable({ onRegister, learnerFocus = false, courseData }: { courseData?: WebsitePreviewData | null; onRegister: (level: CurriculumLevel, context: string) => void; learnerFocus?: boolean }) {
  return <section id="moe-timetable" className={learnerFocus ? 'moe-timetable-learner' : undefined} aria-label="Class timetable">
      <div className="moe-timetable">
        {MOE_CLASSES.map(({ day, startDate, sessions }) => <section key={day} className="site-card moe-day" aria-label={`${day} classes`}>
          <header className="site-card-cover moe-day-heading"><h3 className="site-card-title">{day}</h3><p>From {startDate}</p></header>
          <div className="moe-day-sessions">{sessions.map(({ level, time, title }) => <article key={level} id={`moe-class-${level}`} className={`moe-session moe-session-${level}`} aria-label={`${title}, ${day}, ${time}`}>
            <div className="moe-session-title"><span className="moe-level-number" aria-hidden="true">{level}</span><div><h4>{learnerFocus ? LEVEL_PRESENTATION[level].title : title}</h4><p className="moe-time">Level {level}<span aria-hidden="true"> · </span>{time}</p></div></div>
            <ul className="moe-session-skills" aria-label={`Level ${level} skills`}>{LEVEL_PRESENTATION[level].skills.map(skill => <li key={skill.label}><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg><span>{skill.label}</span></li>)}</ul>
            <CoursePreviewExample data={courseData} {...COURSE_PREVIEWS[level]} />
            <p className="moe-session-price"><strong>{MOE_COURSE_PRICE_AMOUNT}</strong><span>per student</span></p>
            <a className="moe-description-button" href={moeLevelRoute(level)} aria-label={learnerFocus ? `Explore Level ${level} content` : `Level description for ${title}`}>{learnerFocus ? 'Explore the content' : 'Level description'}</a>
            <button type="button" onClick={() => onRegister(level, moeInterestContext(level))} aria-label={`Register interest in ${title}`}>Register interest</button>
          </article>)}</div>
        </section>)}
      </div>
    </section>
}
