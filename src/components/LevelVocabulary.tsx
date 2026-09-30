import { useEffect, useMemo, useState } from 'react'
import { courseVocabulary } from '../lib/courseVocabulary'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import { fetchVocabularyPos, type VocabularyPos } from '../lib/vocabularyPos'
import './LevelVocabulary.css'

export default function LevelVocabulary({ level }: { level: CurriculumLevel }) {
  const [query, setQuery] = useState('')
  const words = useMemo(() => courseVocabulary(level), [level])
  const [metadata, setMetadata] = useState<{ level: number; words: VocabularyPos[] } | null>(null)
  const [failed, setFailed] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setFailed(null)
    void fetchVocabularyPos(words.map(word => word.key), controller.signal).then(result => {
      if (!controller.signal.aborted) setMetadata({ level, words: result })
    }).catch(() => { if (!controller.signal.aborted) setFailed(level) })
    return () => controller.abort()
  }, [level, words, attempt])
  const posByWord = new Map((metadata?.level === level ? metadata.words : []).map(item => [item.word, item]))
  const normalise = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('mi')
  const search = normalise(query.trim())
  const visible = words.filter(item => normalise(`${item.word} ${item.english}`).includes(search))

  return <section className="site-card level-vocabulary" aria-labelledby="level-vocabulary-title">
    <header className="site-card-cover level-vocabulary-cover">
      <h2 id="level-vocabulary-title">Vocabulary</h2>
      <p>Words for Level {level}</p>
    </header>
    <div className="level-vocabulary-tools">
      <label htmlFor="level-vocabulary-search">Find a Māori or English word</label>
      <input id="level-vocabulary-search" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <span role="status">{visible.length === words.length ? `${words.length} words` : `${visible.length} of ${words.length} words`}</span>
    </div>
    {failed === level ? <p className="level-vocabulary-error" role="alert">POS information could not be loaded. <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p> : null}
    <div className="level-vocabulary-table-wrap" tabIndex={0} role="region" aria-label="Vocabulary table">
    <table aria-label={`Level ${level} vocabulary`}>
      <thead><tr><th scope="col">Māori</th><th scope="col">English</th><th scope="col" title="Recorded POS labels across the word’s Te Aka readings">Te Aka POS</th><th scope="col">Broad POS</th><th scope="col">Specific POS</th></tr></thead>
      <tbody>{visible.map(item => <tr key={item.key}>
        <th scope="row" lang="mi">{item.word}</th>
        <td className="level-vocabulary-meaning">{item.english}</td>
        <td><DictionaryPos value={posByWord.get(item.key)} failed={failed === level} /></td>
        <td><InternalPos value={posByWord.get(item.key)?.broadPos} failed={failed === level} /></td>
        <td><InternalPos value={posByWord.get(item.key)?.specificPos} failed={failed === level} /></td>
      </tr>)}</tbody>
    </table>
    </div>
    {visible.length === 0 ? <p className="level-vocabulary-empty">No matching words.</p> : null}
  </section>
}

function EmptyPos({ loading, failed }: { loading?: boolean; failed?: boolean }) {
  return <span className="level-vocabulary-pos-empty" aria-label={failed ? 'Unavailable' : loading ? 'Loading POS' : 'No recorded POS'}>{failed ? 'Unavailable' : loading ? '…' : '—'}</span>
}

function DictionaryPos({ value, failed }: { value?: VocabularyPos; failed: boolean }) {
  if (!value || !value.teAka.length) return <EmptyPos loading={!value} failed={failed} />
  const labels = [...new Map(value.teAka.map(pos => [pos.code, pos])).values()]
  return <ul className="level-vocabulary-pos">{labels.map(pos => <li key={pos.code}>
    {pos.url?.startsWith('https://') ? <a href={pos.url} target="_blank" rel="noreferrer" aria-label={`${pos.label} — Te Aka entry for ${value.word}`}>{pos.label}</a> : pos.label}
  </li>)}</ul>
}

function InternalPos({ value, failed }: { value?: VocabularyPos['specificPos']; failed: boolean }) {
  if (!value || !value.length) return <EmptyPos loading={!value} failed={failed} />
  return <ul className="level-vocabulary-pos">{value.map(pos => <li key={pos.code}>
    {pos.label}<small title={pos.status === 'unreviewed' ? 'Existing word-level assignment that has not been confirmed through review.' : 'Recorded in confirmed word knowledge.'}>{pos.status === 'unreviewed' ? 'Unreviewed' : 'Confirmed'}</small>
  </li>)}</ul>
}
