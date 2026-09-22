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
  { key: 'words', title: 'Word Knowledge', caption: 'Words recognised', total: 300, theme: 'blue' },
  { key: 'structures', title: 'Sentence Structures', caption: 'Patterns used independently', total: 24, theme: 'purple' },
  { key: 'kiwaha', title: 'Kīwaha', caption: 'Expressions used in context', total: 16, theme: 'rose' },
] as const
const statuses: Pronunciation[] = ['Independent', 'With support', 'Learning', 'Not assessed']
const statusClass = (status: Pronunciation) => `cap-status-${status.toLowerCase().replaceAll(' ', '-')}`

function CapabilityIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'pronunciation' ? <path d="M5 13v6m5-11v16m6-21v26m6-21v16m5-11v6" /> : kind === 'words' ? <><path d="M16 8c-4-3-8-3-12-2v21c4-1 8-1 12 2 4-3 8-3 12-2V6c-4-1-8-1-12 2Z M16 8v21" /><path d="M8 11h4m-4 5h4m8-5h4m-4 5h4" /></> : kind === 'structures' ? <><rect x="3" y="5" width="11" height="8" rx="2" /><rect x="18" y="19" width="11" height="8" rx="2" /><path d="M14 9h8v10M18 23H9V13" /></> : <><path d="M5 5h22v17H15l-7 6v-6H5Z" /><path d="M11 11h3l-2 5h-2m9-5h3l-2 5h-2" /></>}
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
    <header className="cap-introduction">
      <h1>A clear view of your team’s capability.</h1>
      <ul>
        <li>See what each staff member can do in te reo Māori.</li>
        <li>Identify where support and further practice are needed.</li>
        <li>Track completed activities and individual next steps.</li>
        <li>Plan development across your organisation.</li>
      </ul>
    </header>
    <div className="cap-dashboard">
      <header className="cap-dashboard-header">
        <div><span className="cap-demo">Sample data</span><h2>Team capabilities</h2></div>
        <label className="cap-team-filter">Team<select value={team} onChange={event => { setTeam(event.target.value); setSelected(null) }} aria-label="Filter team">{['Entire team', 'Customer services', 'Operations', 'Leadership'].map(value => <option key={value}>{value}</option>)}</select></label>
      </header>
      <div className="cap-skill-overview">
        <section className="site-card cap-metric cap-theme-green" aria-label="Pronunciation overview">
          <header className="site-card-cover"><span className="cap-metric-icon"><CapabilityIcon kind="pronunciation" /></span><h3 className="site-card-title">Pronunciation</h3></header>
          <div className="cap-metric-body"><div className="cap-metric-number">{independent}<small> / {cohort.length}</small></div><span className="cap-metric-caption">Staff assessed as independent</span>
            <div className="cap-cohort-dots" aria-label={`${independent} of ${cohort.length} staff assessed as independent`}>{cohort.map(person => <span key={person.name} className={statusClass(person.pronunciation)} title={`${person.name}: ${person.pronunciation}`}>{person.pronunciation === 'Independent' ? '✓' : person.pronunciation === 'Not assessed' ? '–' : '·'}</span>)}</div>
            <footer>{cohort.filter(person => ['Learning', 'With support'].includes(person.pronunciation)).length} practising · {cohort.filter(person => person.pronunciation === 'Not assessed').length} not assessed</footer>
          </div>
        </section>
        {metrics.map(metric => {
          const average = Math.round(cohort.reduce((sum, person) => sum + person[metric.key], 0) / cohort.length)
          return <section className={`site-card cap-metric cap-theme-${metric.theme}`} key={metric.key} aria-label={`${metric.title} overview`}>
            <header className="site-card-cover"><span className="cap-metric-icon"><CapabilityIcon kind={metric.key} /></span><h3 className="site-card-title">{metric.title}</h3></header>
            <div className="cap-metric-body"><div className="cap-metric-number">{average}<small> / {metric.total}</small></div><span className="cap-metric-caption">{metric.caption}</span>
              <meter className="cap-summary-meter" min={0} max={metric.total} value={average} aria-label={`Team average: ${metric.caption}`}>{average} of {metric.total}</meter>
              <footer>Team average · introduced content</footer>
            </div>
          </section>
        })}
      </div>
      <section className="site-card cap-students" aria-label="Team capability matrix">
        <header className="site-card-cover cap-team-cover"><h3 className="site-card-title">Your team</h3><span className="cap-team-count">{cohort.length} team members</span></header>
        <div className="cap-table-toolbar"><input type="search" aria-label="Search team members" placeholder="Find a person" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="cap-legend" aria-label="Pronunciation assessment key">{statuses.map(status => <span className={statusClass(status)} key={status}>{status}</span>)}</div>
        <div className="cap-table-scroll" tabIndex={0} role="region" aria-label="Staff capability comparison">
          <table><thead><tr><th scope="col">Team member</th><th scope="col">Pronunciation</th>{metrics.map(metric => <th scope="col" key={metric.key}>{metric.title}<small>{metric.caption}</small></th>)}<th scope="col">Last completed</th></tr></thead><tbody>
            {visible.map(person => <Fragment key={person.name}>
              <tr className={selected === person.name ? 'cap-row-selected' : undefined}>
                <th scope="row"><button className="cap-person-button" aria-expanded={selected === person.name} onClick={() => setSelected(selected === person.name ? null : person.name)}><span className="cap-avatar" aria-hidden="true">{person.name.split(' ').map(word => word[0]).join('')}</span><span>{person.name}<small>{person.team}</small></span><span className="cap-person-chevron" aria-hidden="true">{selected === person.name ? '−' : '+'}</span></button></th>
                <td><span className={`cap-assessment ${statusClass(person.pronunciation)}`}>{person.pronunciation}</span></td>
                {metrics.map(metric => <td key={metric.key}><CountMeter value={person[metric.key]} total={metric.total} theme={metric.theme} label={`${person.name}: ${metric.caption}`} /></td>)}
                <td className="cap-last-completed">{person.completed}</td>
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
