import { useEffect, useState, type KeyboardEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { draft, levelContent, levels, readRoute, sections, frequencyEvidence, frequencySource, referenceSummary, type Section } from './curriculum-review-model'
import { fetchWordReferences, type WordReference } from '../src/lib/wordReference'
import './curriculum-review.css'

const descriptions = [
  'Introduce yourself and describe your world.',
  'Talk about what happens and when.',
  'Express your needs and give instructions.',
  'Explain belonging, purpose and responsibility.',
  'Compare ideas and express what is possible.',
  'Put your reo into conversation.',
]
const sectionLabels = { vocabulary: 'Vocabulary', kiwaha: 'Kīwaha', structures: 'Sentence structures' }
const readable = (value: string) => value.replaceAll('_', ' ')

export function Review() {
  const [route, setRoute] = useState(() => readRoute(location.hash))
  const [query, setQuery] = useState('')
  const [referenceState, setReferenceState] = useState<{ level: number; entries: WordReference[]; error?: string }>({ level: 0, entries: [] })
  const [retry, setRetry] = useState(0)
  const [sort, setSort] = useState<'word' | 'frequency'>('frequency')
  const { level, section } = route
  const content = levelContent(level)
  const references = new Map((referenceState.level === level ? referenceState.entries : []).map(reference => [reference.word, reference]))
  const loading = referenceState.level !== level
  useEffect(() => {
    let active = true
    fetchWordReferences(levelContent(level).words.map(word => word.word)).then(entries => {
      if (active) setReferenceState({ level, entries })
    }).catch(() => {
      if (active) setReferenceState({ level, entries: [], error: 'Word information could not be loaded.' })
    })
    return () => { active = false }
  }, [level, retry])
  useEffect(() => {
    const update = () => { setRoute(readRoute(location.hash)); setQuery('') }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  function navigate(nextLevel: number, nextSection: Section) {
    window.location.assign(`#level-${nextLevel}/${nextSection}`)
  }
  function tabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    tabs[next].focus()
    tabs[next].click()
  }
  const search = query.trim().normalize('NFC').toLocaleLowerCase()
  const words = content.words.filter(word => {
    const groups = content.groups.filter(group => group.wordKeys.includes(word.key)).map(group => group.title)
    const ref = references.get(word.key)
    const labels = ref ? Object.values(referenceSummary(ref)).flat() : []
    return !search || [word.word, ...groups, ...labels.map(readable)].join(' ').toLowerCase().includes(search)
  }).sort((a, b) => sort === 'frequency'
    ? (a.frequencyRank ?? Infinity) - (b.frequencyRank ?? Infinity) || a.word.localeCompare(b.word, 'mi')
    : a.word.localeCompare(b.word, 'mi'))
  return <main>
    <div className="review-brand"><span>KA PIKI</span><span>Curriculum review</span></div>
    <header className="review-cover review-cover-compact">
      <div><h1>Curriculum review</h1></div>
      <div className="review-total"><strong>{draft.vocabulary.length}<span> / {draft.target.distinctApprovedVocabulary}</span></strong><span>vocabulary candidates drafted</span></div>
    </header>
    <div className="review-levels" role="tablist" aria-label="Course levels" onKeyDown={tabKeys}>
      {levels.map(value => <button key={value} id={`level-tab-${value}`} role="tab" aria-selected={level === value} aria-controls="level-panel" tabIndex={level === value ? 0 : -1} onClick={() => navigate(value, section)}>Level {value}</button>)}
    </div>
    <section id="level-panel" role="tabpanel" aria-labelledby={`level-tab-${level}`}>
      <div className="review-level-heading"><div><p className="eyebrow">Level {level}</p><h2>{descriptions[level - 1]}</h2></div><p className="review-draft">Working draft<br/><span>Content and meanings still to be reviewed</span></p></div>
      <div className="review-sections" role="tablist" aria-label="Learning content" onKeyDown={tabKeys}>
        {sections.map(value => <button key={value} id={`section-tab-${value}`} role="tab" aria-selected={section === value} aria-controls="content-panel" tabIndex={section === value ? 0 : -1} onClick={() => navigate(level, value)}>{sectionLabels[value]}<span>{value === 'vocabulary' ? content.words.length : content[value].length}</span></button>)}
      </div>
      <div id="content-panel" role="tabpanel" aria-labelledby={`section-tab-${section}`} tabIndex={0}>
        {section === 'vocabulary' && <>
          <div className="review-toolbar"><div className="review-counts"><span><strong>{content.introduced}</strong> new words</span><span><strong>{content.revisited}</strong> revisited</span><span><strong>{content.cumulative}</strong> across levels 1{level > 1 ? ` to ${level}` : ''}</span></div><label className="review-search">Find a word<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this level" /></label></div>
          <div className="table-context"><p>POS lists show possibilities, not interchangeable words. Categories and course groups are separate.</p><label>Order <select value={sort} onChange={event => setSort(event.target.value as 'word' | 'frequency')}><option value="frequency">Stored frequency rank</option><option value="word">Alphabetical</option></select></label></div>
          {loading && <p role="status" className="review-note">Loading stored word information…</p>}
          {referenceState.level === level && referenceState.error && <p role="alert">{referenceState.error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
          <div className="vocab-table-wrap" role="region" aria-label={`Level ${level} vocabulary table`} tabIndex={0}><table className="vocab-table"><caption className="sr-only">Level {level} vocabulary, frequency evidence, possible POS and categories</caption><thead><tr><th scope="col">Word</th><th scope="col">Frequency</th><th scope="col">Broad POS</th><th scope="col">Te Aka POS</th><th scope="col">Specific POS</th><th scope="col">Categories</th><th scope="col">Course group</th></tr></thead><tbody>{words.map(word => {
            const reference = references.get(word.key)
            const info = reference ? referenceSummary(reference) : null
            const evidence = frequencyEvidence(word.key)
            const missing = loading ? 'Loading…' : referenceState.error ? 'Unavailable' : 'Not recorded'
            const list = (values?: string[]) => values?.length ? values.map(readable).join(', ') : missing
            return <tr key={word.key}><th scope="row"><span lang="mi">{word.word}</span><small>{word.firstProposedLevel < level ? `Revisit from Level ${word.firstProposedLevel}` : 'New at this level'}</small></th>
              <td><strong>{word.frequencyRank === null ? 'No stored rank' : `#${word.frequencyRank}`}</strong><small>Stored rank · unverified</small>{evidence ? <a href={`${frequencySource.url}#page=${evidence.pages[0]}`} target="_blank" rel="noreferrer">{evidence.starred ? 'PDF: top 360' : 'PDF: listed'}</a> : <small>No exact PDF match</small>}</td>
              <td>{list(info?.broad)}{!!info?.confirmedBroad.length && <small>Observed: {info.confirmedBroad.map(readable).join(', ')}</small>}</td><td>{list(info?.teAka)}{reference && reference.dictionary.entries.some(entry => entry.senses.length) && <details><summary>Meanings</summary>{reference.dictionary.entries.flatMap(entry => entry.senses.map(sense => <p key={JSON.stringify(sense.reference)}><strong>{sense.label ? readable(sense.label) : 'No label'}{sense.qualifier ? ` (${sense.qualifier})` : ''}</strong><br/>{sense.definition || 'No definition recorded'}</p>))}<small>Stored Te Aka entries, not selected course meanings.</small></details>}</td>
              <td>{list(info?.specific)}{!!info?.confirmedSpecific.length && <small>Observed: {info.confirmedSpecific.map(readable).join(', ')}</small>}</td>
              <td>{info?.sourceCategories.length ? <span>{info.sourceCategories.join(', ')}<small>Source word categories</small></span> : null}{info?.learnedCategories.length ? <span>{info.learnedCategories.map(readable).join(', ')}<small>Observed in confirmed uses</small></span> : null}{!info?.sourceCategories.length && !info?.learnedCategories.length ? missing : null}</td>
              <td>{content.groups.filter(group => group.wordKeys.includes(word.key)).map(group => <span className="course-group-label" key={group.id}>{group.title}</span>)}</td></tr>
          })}</tbody></table></div>
          {!words.length && <p className="review-empty">No words match “{query}” in this level.</p>}
        </>}
        {section === 'kiwaha' && <div className="review-expressions">{content.kiwaha.map(item => <article className="review-expression" key={item.id}><p className="eyebrow">{item.conversationUse}</p><h3 lang="mi">{item.text}</h3><p className="review-meaning">{item.teachingMeaning}</p><p>{item.usageNote}</p><footer><span>Proposed expression</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">Dictionary reference ↗</a></footer></article>)}<p className="review-note">This is a starting selection, not the complete kīwaha content for this level.</p></div>}
        {section === 'structures' && <div className="review-structures">{content.structures.map(item => <article key={item.id}><p className="eyebrow">{item.label}</p><h3 lang="mi">{item.maori}</h3><p>{item.english}</p></article>)}</div>}
      </div>
    </section>
    <footer className="review-footer">Independent review page · Not connected to enrolment or app practice</footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<Review />)
