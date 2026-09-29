import { useState } from 'react'
import { courseVocabulary } from '../lib/courseVocabulary'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import './LevelVocabulary.css'

export default function LevelVocabulary({ level }: { level: CurriculumLevel }) {
  const [query, setQuery] = useState('')
  const words = courseVocabulary(level)
  const normalise = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('mi')
  const search = normalise(query.trim())
  const visible = words.filter(item => normalise(`${item.word} ${item.topics.join(' ')}`).includes(search))

  return <section className="site-card level-vocabulary" aria-labelledby="level-vocabulary-title">
    <header className="site-card-cover level-vocabulary-cover">
      <h2 id="level-vocabulary-title">Vocabulary</h2>
      <p>Words for Level {level}</p>
    </header>
    <div className="level-vocabulary-tools">
      <label htmlFor="level-vocabulary-search">Find a word or topic</label>
      <input id="level-vocabulary-search" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <span role="status">{visible.length === words.length ? `${words.length} words` : `${visible.length} of ${words.length} words`}</span>
    </div>
    <table aria-label={`Level ${level} vocabulary`}>
      <thead><tr><th scope="col">Māori</th><th scope="col">Topic</th></tr></thead>
      <tbody>{visible.map(item => <tr key={item.key}>
        <th scope="row" lang="mi">{item.word}</th>
        <td>{item.topics.join(' · ')}</td>
      </tr>)}</tbody>
    </table>
    {visible.length === 0 ? <p className="level-vocabulary-empty">No matching words.</p> : null}
  </section>
}
