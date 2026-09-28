import './SiteIdentity.css'
import { Fragment, useState } from 'react'
import './CapabilitiesDashboard.css'

type Pronunciation = 'Independent' | 'With support' | 'Learning' | 'Not assessed'
type Person = { name: string; team: string; pronunciation: Pronunciation; words: number; structures: number; kiwaha: number; completed: string; next: string }
// Demonstration records only; these are not live staff assessments.
const people: Person[] = [
  { name: 'Maia Thompson', team: 'Customer services', pronunciation: 'Independent', words: 240, structures: 18, kiwaha: 8, completed: 'Sentence structures · 12 Sep', next: 'Practise questions and explanations' },
  { name: 'Wiremu King', team: 'Operations', pronunciation: 'Independent', words: 285, structures: 22, kiwaha: 14, completed: 'Kīwaha in conversation · 11 Sep', next: 'Extend use of everyday expressions' },
  { name: 'Sophie Lee', team: 'Customer services', pronunciation: 'With support', words: 110, structures: 7, kiwaha: 3, completed: 'Word recognition · 10 Sep', next: 'Practise vowel length and familiar sentence patterns' },
  { name: 'Aria Wilson', team: 'Leadership', pronunciation: 'Independent', words: 215, structures: 16, kiwaha: 10, completed: 'Pronunciation check-in · 12 Sep', next: 'Use a wider range of sentence structures' },
  { name: 'Noah Williams', team: 'Operations', pronunciation: 'Learning', words: 145, structures: 10, kiwaha: 4, completed: 'Word recognition · 9 Sep', next: 'Practise pronunciation and building sentences' },
  { name: 'Hana Brown', team: 'Leadership', pronunciation: 'Not assessed', words: 60, structures: 3, kiwaha: 1, completed: 'Sentence structures · 8 Sep', next: 'Complete a pronunciation check-in' },
]
const metrics = [
  { key: 'words', title: 'Word Knowledge', benefit: 'See how much familiar language your team has to draw on.', caption: 'Words recognised', total: 300, theme: 'blue' },
  { key: 'structures', title: 'Sentence Structures', benefit: 'See which sentence patterns your team can use without help.', caption: 'Patterns used independently', total: 24, theme: 'purple' },
  { key: 'kiwaha', title: 'Kīwaha', benefit: 'See which everyday expressions your team is putting to use.', caption: 'Expressions used in context', total: 16, theme: 'rose' },
] as const
const statuses: Pronunciation[] = ['Independent', 'With support', 'Learning', 'Not assessed']
const statusClass = (status: Pronunciation) => `cap-status-${status.toLowerCase().replaceAll(' ', '-')}`

const capabilityBenefits = [
  { text: 'See what each staff member can do in te reo Māori.', icon: 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 21v-2a7 7 0 0 1 14 0v2M19 5a3 3 0 0 1 0 6m2 3a6 6 0 0 1 2 5' },
  { text: 'Identify where support and further practice are needed.', icon: 'M4 13v-1a8 8 0 0 1 16 0v1M4 12H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v-6H4Zm16 0h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3v-6h2Zm0 6v1a3 3 0 0 1-3 3h-5' },
  { text: 'Track completed activities and individual next steps.', icon: 'M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 2h6v4H9V2Zm-1 9 2 2 3-3m-5 7 2 2 3-3m3-4h1m-1 6h1' },
  { text: 'Plan development across your organisation.', icon: 'M3 3v18h18M7 15l5-5 4 3 5-7m-5 0h5v5' },
] as const

function CapabilityIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'person' ? <><circle cx="16" cy="9" r="5"/><path d="M6 28v-3a10 10 0 0 1 20 0v3"/></> : kind === 'completed' ? <><rect x="5" y="6" width="22" height="23" rx="2"/><path d="M10 3v6m12-6v6M5 13h22m-16 7 4 4 7-8"/></> : kind === 'pronunciation' ? <path d="M5 13v6m5-11v16m6-21v26m6-21v16m5-11v6" /> : kind === 'words' ? <><path d="M16 8c-4-3-8-3-12-2v21c4-1 8-1 12 2 4-3 8-3 12-2V6c-4-1-8-1-12 2Z M16 8v21" /><path d="M8 11h4m-4 5h4m8-5h4m-4 5h4" /></> : kind === 'structures' ? <><rect x="3" y="5" width="11" height="8" rx="2" /><rect x="18" y="19" width="11" height="8" rx="2" /><path d="M14 9h8v10M18 23H9V13" /></> : <><path d="M5 5h22v17H15l-7 6v-6H5Z" /><path d="M11 11h3l-2 5h-2m9-5h3l-2 5h-2" /></>}
  </svg>
}

function CountMeter({ value, total, label, theme }: { value: number; total: number; label: string; theme: string }) {
  return <div className={`cap-count cap-theme-${theme}`}>
    <span><strong>{value}</strong><small> / {total}</small></span>
    <meter min={0} max={total} value={value} aria-label={label}>{value} of {total}</meter>
  </div>
}

export default function CapabilitiesDashboard() {
  const [team, setTeam] = useState('Entire team')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const cohort = people.filter(person => team === 'Entire team' || person.team === team)
  const visible = cohort.filter(person => person.name.toLowerCase().includes(query.toLowerCase()))
  const independent = cohort.filter(person => person.pronunciation === 'Independent').length
  return <>
    <section className="cap-introduction site-card" aria-labelledby="cap-introduction-heading">
      <header className="site-card-cover"><h1 id="cap-introduction-heading" className="site-card-title">A clear view of your team’s capability.</h1></header>
      <ul>
        {capabilityBenefits.map(({ text, icon }) => <li key={text}>
          <svg className="cap-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={icon} /></svg>
          <span>{text}</span>
        </li>)}
      </ul>
    </section>
    <div className="cap-dashboard">
      <header className="cap-dashboard-header">
        <h2>Team capabilities</h2>
        <label className="cap-team-filter">Team<select value={team} onChange={event => { setTeam(event.target.value); setSelected(null) }} aria-label="Filter team">{['Entire team', 'Customer services', 'Operations', 'Leadership'].map(value => <option key={value}>{value}</option>)}</select></label>
      </header>
      <div className="cap-skill-overview">
        <section className="site-card cap-metric cap-theme-green" aria-label="Pronunciation overview">
          <header className="site-card-cover"><span className="cap-metric-icon"><CapabilityIcon kind="pronunciation" /></span><div><h3 className="site-card-title">Pronunciation</h3><p className="site-benefit-intro">See who can pronounce words independently and who needs support.</p></div></header>
          <div className="cap-metric-body"><div className="cap-metric-number">{independent}<small> / {cohort.length}</small></div><span className="cap-metric-caption">Staff assessed as independent</span>
            <div className="cap-cohort-dots" aria-label={`${independent} of ${cohort.length} staff assessed as independent`}>{cohort.map(person => <span key={person.name} className={statusClass(person.pronunciation)} title={`${person.name}: ${person.pronunciation}`}>{person.pronunciation === 'Independent' ? '✓' : person.pronunciation === 'Not assessed' ? '–' : '·'}</span>)}</div>
            <footer>{cohort.filter(person => ['Learning', 'With support'].includes(person.pronunciation)).length} practising · {cohort.filter(person => person.pronunciation === 'Not assessed').length} not assessed</footer>
          </div>
        </section>
        {metrics.map(metric => {
          const average = Math.round(cohort.reduce((sum, person) => sum + person[metric.key], 0) / cohort.length)
          return <section className={`site-card cap-metric cap-theme-${metric.theme}`} key={metric.key} aria-label={`${metric.title} overview`}>
            <header className="site-card-cover"><span className="cap-metric-icon"><CapabilityIcon kind={metric.key} /></span><div><h3 className="site-card-title">{metric.title}</h3><p className="site-benefit-intro">{metric.benefit}</p></div></header>
            <div className="cap-metric-body"><div className="cap-metric-number">{average}<small> / {metric.total}</small></div><span className="cap-metric-caption">{metric.caption}</span>
              <meter className="cap-summary-meter" min={0} max={metric.total} value={average} aria-label={`Team average: ${metric.caption}`}>{average} of {metric.total}</meter>
              <footer>Team average · introduced content</footer>
            </div>
          </section>
        })}
      </div>
      <section className="site-card cap-students" aria-label="Team capability matrix">
        <header className="site-card-cover cap-team-cover"><div><h3 className="site-card-title">Your team</h3><p className="site-benefit-intro">Know what each person can do, where they need support and what to focus on next.</p></div><span className="cap-team-count">{visible.length} {visible.length === 1 ? 'team member' : 'team members'}</span></header>
        <div className="cap-table-toolbar"><input type="search" aria-label="Search team members" placeholder="Find a person" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="cap-legend" aria-label="Pronunciation assessment key">{statuses.map(status => <span className={statusClass(status)} key={status}>{status}</span>)}</div>
        <div className="cap-table-scroll" tabIndex={0} role="region" aria-label="Staff capability comparison">
          <table><thead><tr><th scope="col"><span className="cap-column-heading"><CapabilityIcon kind="person"/>Team member</span></th><th scope="col"><span className="cap-column-heading"><CapabilityIcon kind="pronunciation"/>Pronunciation</span></th>{metrics.map(metric => <th scope="col" key={metric.key}><span className="cap-column-heading"><CapabilityIcon kind={metric.key}/>{metric.title}</span></th>)}<th scope="col"><span className="cap-column-heading"><CapabilityIcon kind="completed"/>Last completed</span></th></tr></thead><tbody>
            {visible.map(person => <Fragment key={person.name}>
              <tr className={selected === person.name ? 'cap-row-selected' : undefined}>
                <th scope="row"><button className="cap-person-button" aria-expanded={selected === person.name} onClick={() => setSelected(selected === person.name ? null : person.name)}><span className="cap-avatar" aria-hidden="true">{person.name.split(' ').map(word => word[0]).join('')}</span><span>{person.name}<small>{person.team}</small></span><span className="cap-person-chevron" aria-hidden="true">{selected === person.name ? '−' : '+'}</span></button></th>
                <td data-label="Pronunciation"><span className={`cap-assessment ${statusClass(person.pronunciation)}`}>{person.pronunciation}</span></td>
                {metrics.map(metric => <td key={metric.key} data-label={metric.title}><CountMeter value={person[metric.key]} total={metric.total} theme={metric.theme} label={`${person.name}: ${metric.caption}`} /></td>)}
                <td className="cap-last-completed" data-label="Last completed">{person.completed}</td>
              </tr>
              {selected === person.name && <tr className="cap-detail-row"><td colSpan={6}><section className="cap-person-detail" aria-label={`${person.name} next step`}><div><span>Next step</span><strong>{person.next}</strong></div><div><span>Iwi affiliation · optional</span><strong>Not shared</strong></div></section></td></tr>}
            </Fragment>)}
            {!visible.length && <tr><td colSpan={6} className="cap-empty">No team members match.</td></tr>}
          </tbody></table>
        </div>
      </section>
    </div>
  </>
}
