import { useRef, type ReactNode } from 'react'
import { LEVEL_PRESENTATION } from '../lib/coursePresentation'
import { CURRICULUM_LEVELS, type CurriculumLevel } from '../lib/sentenceStructureLevels'
import { MOE_CLASSES } from '../lib/moeOffer'
import { contextualRoute, type LevelTab } from '../lib/websiteRoutes'
import './LevelExplorer.css'

const TABS = [
  { id: 'structures', label: 'Sentence structures', icon: 'M3 5h7v5H3Zm11 9h7v5h-7ZM6 10v6h8' },
  { id: 'vocabulary', label: 'Vocabulary', icon: 'M4 3h16v18H4ZM8 7h8M8 12h8M8 17h5' },
  { id: 'stories', label: 'Reading material', icon: 'M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15' },
  { id: 'practice', label: 'Practice', icon: 'M20 7H8a5 5 0 0 0-5 5m13-9 4 4-4 4M4 17h12a5 5 0 0 0 5-5M8 13l-4 4 4 4' },
] as const

export default function LevelExplorer({ level, moe, tab, onRegister, children }: {
  level: CurriculumLevel; moe: boolean; tab: LevelTab; onRegister: () => void; children: ReactNode
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const touch = useRef<{ x: number; y: number } | null>(null)
  const course = LEVEL_PRESENTATION[level]
  const day = MOE_CLASSES.find(item => item.sessions.some(session => session.level === level))!
  const session = day.sessions.find(item => item.level === level)!
  const levelHref = (next: number, selectedTab = tab) => contextualRoute(moe, `#levels/${next}?tab=${selectedTab}`)
  const changeTab = (next: LevelTab) => { window.location.assign(levelHref(level, next)) }
  const previous = level > 1 ? level - 1 : null
  const next = level < 6 ? level + 1 : null
  return <section className="level-explorer" aria-label={`Explore Level ${level}`}>
    <div className="site-card level-intro">
    <header className="site-card-cover level-intro-cover">
    <div className="level-intro-utility">
      <a className="level-return" href={moe ? `#moe?class=${level}` : '#level-finder'}>{moe ? 'Back to your class' : 'All levels'}</a>
    <nav className="level-carousel" aria-label="Browse course levels"
      onTouchStart={event => { const point = event.touches[0]; if (point) touch.current = { x: point.clientX, y: point.clientY } }}
      onTouchCancel={() => { touch.current = null }}
      onTouchEnd={event => {
        const start = touch.current; touch.current = null
        const point = event.changedTouches[0]
        if (!start || !point) return
        const dx = point.clientX - start.x
        if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(point.clientY - start.y) * 1.5) return
        const destination = dx > 0 ? previous : next
        if (destination) window.location.assign(levelHref(destination))
      }}>
      {previous ? <a href={levelHref(previous)} className="level-carousel-step" aria-label={`Previous level, Level ${previous}`}>Previous</a> : null}
      <select aria-label="Choose level" value={level} onChange={event => window.location.assign(levelHref(Number(event.target.value)))}>
        {CURRICULUM_LEVELS.map(item => <option key={item} value={item}>Level {item} of 6</option>)}
      </select>
      {next ? <a href={levelHref(next)} className="level-carousel-step" aria-label={`Next level, Level ${next}`}>Next</a> : null}
    </nav>
    </div>
    <div className="level-intro-main">
      <div className="level-explorer-heading"><h1 id="level-explorer-title" tabIndex={-1}>{course.title}</h1>
        <ul className="level-intro-skills" aria-label="Skills in this level">{course.skills.map(skill => <li key={skill.label}><strong>{skill.label}</strong><span>{skill.pattern}</span></li>)}</ul>
        <button type="button" className="level-register" onClick={onRegister}>Register interest</button>
      </div>
      <div className="level-class-bar">
        {moe ? <div><strong>{day.day} · {session.time}</strong><span>Starts {day.startDate} 2026</span></div> : <div><strong>10 weeks · One hour weekly</strong><span>Register to discuss class times</span></div>}
      </div>
    </div>
    </header>
    <div className="level-tabs" role="tablist" aria-label="Explore this level">{TABS.map((item, index) => <button key={item.id} ref={node => { tabs.current[index] = node }}
      type="button" role="tab" id={`level-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="level-tab-panel" tabIndex={tab === item.id ? 0 : -1}
      onClick={() => changeTab(item.id)} onKeyDown={event => {
        const destination = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null
        if (destination === null) return
        event.preventDefault(); tabs.current[destination]?.focus(); changeTab(TABS[destination]!.id)
      }}><span className="moe-benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg></span><span>{item.label}</span></button>)}</div>
    </div>
    <div id="level-tab-panel" role="tabpanel" aria-labelledby={`level-tab-${tab}`} tabIndex={0} className="level-tab-panel">{children}</div>
  </section>
}
