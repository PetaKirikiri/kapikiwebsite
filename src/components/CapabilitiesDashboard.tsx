import { useState } from 'react'
import './CapabilitiesDashboard.css'

type Capability = 'Independent' | 'With support' | 'Learning' | 'Not assessed'
const skills = ['Pepeha', 'Karakia', 'Pronunciation', 'Greetings', 'Introductions'] as const
const people: { name: string; team: string; iwi: string; abilities: Capability[]; completed: string; next: string }[] = [
  { name: 'Maia Thompson', team: 'Customer services', iwi: 'Not shared', abilities: ['Independent', 'With support', 'Independent', 'Independent', 'Independent'], completed: 'Pepeha presentation · 12 Sep', next: 'Lead a karakia' },
  { name: 'Wiremu King', team: 'Operations', iwi: 'Not shared', abilities: ['Independent', 'Independent', 'Independent', 'Independent', 'Independent'], completed: 'Karakia facilitation · 11 Sep', next: 'Support team practice' },
  { name: 'Sophie Lee', team: 'Customer services', iwi: 'Not shared', abilities: ['Learning', 'Not assessed', 'With support', 'Independent', 'Learning'], completed: 'Greetings practice · 10 Sep', next: 'Practise introductions' },
  { name: 'Aria Wilson', team: 'Leadership', iwi: 'Not shared', abilities: ['Independent', 'Independent', 'With support', 'Independent', 'Independent'], completed: 'Pepeha presentation · 12 Sep', next: 'Practise vowel length' },
  { name: 'Noah Williams', team: 'Operations', iwi: 'Not shared', abilities: ['With support', 'Learning', 'With support', 'Independent', 'With support'], completed: 'Pronunciation practice · 9 Sep', next: 'Present a pepeha with support' },
  { name: 'Hana Brown', team: 'Leadership', iwi: 'Not shared', abilities: ['Not assessed', 'Not assessed', 'Learning', 'With support', 'Not assessed'], completed: 'Pronunciation practice · 8 Sep', next: 'Complete an initial check-in' },
]
const statusClass = (status: Capability) => `cap-ability cap-ability-${status.toLowerCase().replaceAll(' ', '-')}`

export default function CapabilitiesDashboard() {
  const [team, setTeam] = useState('Entire team')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const cohort = people.filter(person => team === 'Entire team' || person.team === team)
  const visible = cohort.filter(person => person.name.toLowerCase().includes(query.toLowerCase()))
  const person = people.find(person => person.name === selected)
  return <>
    <header className="cap-introduction">
      <h1>A clear view of your team’s capability.</h1>
      <p>Understand what your staff can do in te reo Māori, where they need support and what to focus on next.</p>
      <p>Bring individual learning into a shared view of practical skills, completed activities and next steps, so you can plan development across your organisation.</p>
    </header>
    <div className="cap-dashboard">
    <header className="cap-dashboard-header">
      <div><span className="cap-demo">Sample data</span><h3>Team capabilities</h3></div>
      <select aria-label="Filter team" value={team} onChange={event => setTeam(event.target.value)}>{['Entire team', 'Customer services', 'Operations', 'Leadership'].map(value => <option key={value}>{value}</option>)}</select>
    </header>
    <div className="cap-skill-overview">{skills.map((skill, index) => <div className="cap-stat" key={skill}><span>{skill}</span><strong>{cohort.filter(person => person.abilities[index] === 'Independent').length}<small> / {cohort.length}</small></strong><span>Independent</span></div>)}</div>
    <section className="cap-students" aria-label="Team capability matrix">
      <div className="cap-table-toolbar"><h4>{cohort.length} team members</h4><input type="search" aria-label="Search team members" placeholder="Find a person" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="cap-legend">{(['Independent', 'With support', 'Learning', 'Not assessed'] as const).map(status => <span className={statusClass(status)} key={status}>{status}</span>)}</div>
      <div className="cap-table-scroll"><table><thead><tr><th>Person</th>{skills.map(skill => <th key={skill}>{skill}</th>)}<th>Iwi affiliation <span title="Optional, self-described identity; not a capability score">(optional)</span></th><th>Last completed</th></tr></thead><tbody>
        {visible.map(person => <tr key={person.name}><td><button className="cap-person-button" onClick={() => setSelected(person.name)}><span className="cap-avatar" aria-hidden="true">{person.name.split(' ').map(word => word[0]).join('')}</span><span>{person.name}<small>{person.team}</small></span></button></td>{person.abilities.map((status, index) => <td key={skills[index]}><span className={statusClass(status)}>{status}</span></td>)}<td className="cap-muted">{person.iwi}</td><td>{person.completed}</td></tr>)}
        {!visible.length && <tr><td colSpan={8} className="cap-empty">No team members match.</td></tr>}
      </tbody></table></div>
    </section>
    {person && <section className="cap-person-detail" aria-label={`${person.name} capabilities`}>
      <header><div><h4>{person.name}</h4><span>{person.team}</span></div><button onClick={() => setSelected(null)} aria-label="Close person details">✕</button></header>
      <div className="cap-detail-grid"><div><h5>Can do independently</h5><ul>{skills.filter((_, index) => person.abilities[index] === 'Independent').map(skill => <li key={skill}>{skill}</li>)}</ul>{!person.abilities.includes('Independent') && <span>None confirmed yet</span>}</div><div><h5>Needs support or practice</h5><ul>{skills.filter((_, index) => ['Learning', 'With support'].includes(person.abilities[index])).map(skill => <li key={skill}>{skill}</li>)}</ul>{!person.abilities.some(status => ['Learning', 'With support'].includes(status)) && <span>None recorded</span>}</div><div><h5>Completed</h5><span>{person.completed}</span><h5>Next step</h5><span>{person.next}</span></div></div>
      <div className="cap-identity"><strong>Iwi affiliation</strong><span>{person.iwi} · Optional, self-described</span></div>
    </section>}
    </div>
  </>
}
