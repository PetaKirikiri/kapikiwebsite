import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { courseVocabulary } from '../lib/courseVocabulary'
import { courseReadingLanguage } from '../lib/courseReadingLanguage'
import { courseKiwaha } from '../lib/courseKiwaha'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import { fetchVocabularyPos, type VocabularyPos } from '../lib/vocabularyPos'
import type { BusManifestPosCatalog } from '../lib/busManifestContract'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import { posLegend, type PosLegendKind } from '../lib/connectorPresentation/posLegend'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import SavedConnectorCheckpoint from './SavedConnectorCheckpoint'
import './LevelVocabulary.css'

export default function LevelVocabulary({ level, catalog }: { level: CurriculumLevel; catalog?: BusManifestPosCatalog }) {
  const { collection } = useDesignSpaceCollection({ production: true })
  const { rules } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  const railPlans = useMemo(() => {
    const plans = new Map<string, ReturnType<typeof posLegend>>()
    if (catalog) {
      for (const label of catalog.dictionaryPosLabels) plans.set(`dictionary:${label.labelCode}`, posLegend(label.labelCode, 'dictionary', catalog, library, rules))
      for (const group of catalog.groups) plans.set(`broad:${group.groupCode}`, posLegend(group.groupCode, 'broad', catalog, library, rules))
      for (const type of catalog.posTypes) plans.set(`specific:${type.posCode}`, posLegend(type.posCode, 'specific', catalog, library, rules))
    }
    return plans
  }, [catalog, library, rules])
  const legend = (code: string, kind: PosLegendKind) => {
    const plan = railPlans.get(`${kind}:${code}`)
    if (!plan) return null
    return <span className="level-vocabulary-pos-rail" aria-hidden="true" data-pos-rail={code}>
      <span className="level-vocabulary-pos-material" style={{ backgroundColor: plan.color }} />
      {plan.face?.status === 'ready' ? <SavedConnectorCheckpoint plan={plan.face} displayHeight={18} /> : null}
    </span>
  }
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
  const readingLanguage = courseReadingLanguage(level).filter(item => normalise(`${item.text} ${item.english}`).includes(search))
  const kiwaha = courseKiwaha(level).filter(item => normalise(`${item.text} ${item.english}`).includes(search))

  return <section className="site-card level-vocabulary" aria-labelledby="level-vocabulary-title">
    <header className="site-card-cover level-vocabulary-cover">
      <h2 id="level-vocabulary-title">Vocabulary</h2>
      <p>Words for Level {level}</p>
    </header>
    {kiwaha.length > 0 && <section className="level-vocabulary-kiwaha" aria-labelledby="level-kiwaha-title">
      <h3 id="level-kiwaha-title">Kīwaha · Level {level}</h3>
      <dl>{kiwaha.map(item => <div key={item.id}>
        <dt lang="mi">{item.text}</dt><dd>{item.english}</dd>
        <dd><a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Te Aka entry for ${item.text}`}>Te Aka</a></dd>
      </div>)}</dl>
    </section>}
    {readingLanguage.length > 0 && <section className="level-vocabulary-reading-language" aria-labelledby="level-reading-language-title">
      <h3 id="level-reading-language-title">Time &amp; linking words · Level {level}</h3>
      <dl>{readingLanguage.map(item => <div key={item.id}>
        <dt lang="mi">{item.text}</dt><dd>{item.english}</dd>
        <dd className="level-vocabulary-language-example"><span lang="mi">{item.example[0]}</span><span>{item.example[1]}</span></dd>
        <dd><a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source for ${item.text}`}>{item.sourceUrl.includes('maoridictionary') ? 'Te Aka' : 'Kauwhata Reo'}</a></dd>
      </div>)}</dl>
    </section>}
    <div className="level-vocabulary-tools">
      <label htmlFor="level-vocabulary-search">Find a Māori or English word</label>
      <input id="level-vocabulary-search" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <span role="status">{visible.length === words.length ? `${words.length} words` : `${visible.length} of ${words.length} words`}</span>
    </div>
    {failed === level ? <p className="level-vocabulary-error" role="alert">Word information could not be loaded. <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p> : null}
    <div className="level-vocabulary-table-wrap" tabIndex={0} role="region" aria-label="Vocabulary table">
    <table aria-label={`Level ${level} vocabulary`}>
      <thead><tr><th scope="col">Māori</th><th scope="col">English</th><th scope="col" title="Recorded POS labels across the word’s Te Aka readings">Te Aka POS</th><th scope="col">Broad POS</th><th scope="col">Specific POS</th><th scope="col" title="Recorded categories across this word’s uses">Category</th></tr></thead>
      <tbody>{visible.map(item => <tr key={item.key}>
        <th scope="row" lang="mi">{item.word}</th>
        <td className="level-vocabulary-meaning">{item.english}</td>
        <td><DictionaryPos value={posByWord.get(item.key)} failed={failed === level} legend={legend} /></td>
        <td><InternalPos value={posByWord.get(item.key)?.broadPos} failed={failed === level} legend={legend} kind="broad" /></td>
        <td><InternalPos value={posByWord.get(item.key)?.specificPos} failed={failed === level} legend={legend} kind="specific" /></td>
        <td><Categories value={posByWord.get(item.key)?.categories} failed={failed === level} /></td>
      </tr>)}</tbody>
    </table>
    </div>
    {visible.length === 0 ? <p className="level-vocabulary-empty">No matching words.</p> : null}
  </section>
}

function EmptyPos({ loading, failed }: { loading?: boolean; failed?: boolean }) {
  return <span className="level-vocabulary-pos-empty" aria-label={failed ? 'Unavailable' : loading ? 'Loading POS' : 'No recorded POS'}>{failed ? 'Unavailable' : loading ? '…' : '—'}</span>
}

type Legend = (code: string, kind: PosLegendKind) => ReactNode

function DictionaryPos({ value, failed, legend }: { value?: VocabularyPos; failed: boolean; legend: Legend }) {
  if (!value || !value.teAka.length) return <EmptyPos loading={!value} failed={failed} />
  const labels = [...new Map(value.teAka.map(pos => [pos.code, pos])).values()]
  return <ul className="level-vocabulary-pos">{labels.map(pos => <li key={pos.code}>
    {legend(pos.code, 'dictionary')}
    {pos.url?.startsWith('https://') ? <a href={pos.url} target="_blank" rel="noreferrer" aria-label={`${pos.label} — Te Aka entry for ${value.word}`}>{pos.label}</a> : pos.label}
  </li>)}</ul>
}

function InternalPos({ value, failed, legend, kind }: { value?: VocabularyPos['specificPos']; failed: boolean; legend: Legend; kind: 'broad' | 'specific' }) {
  if (!value || !value.length) return <EmptyPos loading={!value} failed={failed} />
  return <ul className="level-vocabulary-pos">{value.map(pos => <li key={pos.code}>
    {legend(pos.code, kind)}{pos.label}<small title={pos.status === 'unreviewed' ? 'Existing word-level assignment that has not been confirmed through review.' : 'Recorded in confirmed word knowledge.'}>{pos.status === 'unreviewed' ? 'Unreviewed' : 'Confirmed'}</small>
  </li>)}</ul>
}

function Categories({ value, failed }: { value?: VocabularyPos['categories']; failed: boolean }) {
  if (!value || !value.length) return <span className="level-vocabulary-pos-empty" aria-label={failed ? 'Unavailable' : !value ? 'Loading category' : 'No recorded category'}>{failed ? 'Unavailable' : !value ? '…' : 'Not assigned'}</span>
  return <ul className="level-vocabulary-pos">{value.map(category => <li key={category.code}>{category.label}</li>)}</ul>
}
