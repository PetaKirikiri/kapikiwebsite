import { LEVEL_READING_ANNOTATIONS } from '../lib/levelReadingAnnotations'
import { requestRails } from '../lib/connectorPresentation/engine'
import { courseBigWords, bigWordPosCodes } from '../lib/courseBigWords'
import LevelBigWords from './LevelBigWords'
import type { BigWordStructure } from '../lib/courseBigWords'
import { vocabularyNumberValue } from '../lib/vocabularyNumberOrder'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { courseVocabularyEntries, type VocabularyEntryKind } from '../lib/courseVocabularyEntries'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import { fetchVocabularyPos, type VocabularyPos } from '../lib/vocabularyPos'
import type { BusManifestPosCatalog } from '../lib/busManifestContract'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import type { PosLegendKind } from '../lib/connectorPresentation/posLegend'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import SavedConnectorCheckpoint from './SavedConnectorCheckpoint'
import './LevelVocabulary.css'

export default function LevelVocabulary({ level, catalog, sentences }: { level: CurriculumLevel; catalog?: BusManifestPosCatalog; sentences?: readonly BigWordStructure[] }) {
  const { collection } = useDesignSpaceCollection({ production: true })
  const { rules } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  const nounCatalog = useMemo(() => requestRails({
    kind: 'noun-catalog',
    sources: [...(sentences ?? []).filter(sentence => sentence.curriculumLevel && sentence.curriculumLevel <= level), ...LEVEL_READING_ANNOTATIONS],
    families: new Map(catalog?.posTypes.map(type => [type.posCode, type.groupCode]) ?? []),
  }), [sentences, level, catalog])
  const railPlans = useMemo(() => {
    const plans = new Map<string, ReturnType<typeof import('../lib/connectorPresentation/posLegend').posLegend>>()
    if (catalog) {
      for (const label of catalog.dictionaryPosLabels) plans.set(`dictionary:${label.labelCode}`, requestRails({ kind: 'legend', args: [label.labelCode, 'dictionary', catalog, library, rules] }))
      for (const group of catalog.groups) plans.set(`broad:${group.groupCode}`, requestRails({ kind: 'legend', args: [group.groupCode, 'broad', catalog, library, rules] }))
      for (const type of catalog.posTypes) plans.set(`specific:${type.posCode}`, requestRails({ kind: 'legend', args: [type.posCode, 'specific', catalog, library, rules] }))
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
  const [kind, setKind] = useState<'big' | 'word' | 'phrase'>(() => typeof window !== 'undefined' && /section=(kiwaha|reading-language)/.test(window.location.hash) && (window.location.hash.includes('kiwaha') || level === 3) ? 'phrase' : 'big')
  const [selectedType, setPosFilter] = useState('')
  const entries = useMemo(() => courseVocabularyEntries(level), [level])
  const words = useMemo(() => entries.filter(entry => entry.kind === 'word'), [entries])
  const [metadata, setMetadata] = useState<{ level: number; words: VocabularyPos[] } | null>(null)
  const [failed, setFailed] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setFailed(null)
    void fetchVocabularyPos(words.map(word => word.key!), controller.signal).then(result => {
      if (!controller.signal.aborted) setMetadata({ level, words: result })
    }).catch(() => { if (!controller.signal.aborted) setFailed(level) })
    return () => controller.abort()
  }, [level, words, attempt])
  const posByWord = new Map((metadata?.level === level ? metadata.words : []).map(item => [item.word, item]))
  const belongsToKind = (entry: typeof entries[number], value: VocabularyEntryKind | 'big') => value === 'big' ? false : value === 'word' ? entry.kind === 'word' : entry.kind === 'phrase' || entry.kind === 'kiwaha' || entry.functionType === 'Conjunction'
  const scoped = entries.filter(entry => belongsToKind(entry, kind))
  const posGroups = [
    { label: 'Expression function', prefix: 'function', options: [...new Set(scoped.flatMap(entry => entry.functionType ? [entry.functionType] : []))].sort().map(label => ({ code: label, label })) },
    ...(['teAka', 'broadPos', 'specificPos'] as const).map((field, index) => ({
      label: ['Te Aka POS', 'Broad POS', 'Specific POS'][index], prefix: field,
      options: [...new Map(scoped.flatMap<{ code: string; label: string }>(entry => entry.key ? (posByWord.get(entry.key)?.[field] ?? []) : []).map(pos => [pos.code, pos])).values()].sort((a, b) => a.label.localeCompare(b.label)),
    })),
  ]
  const allowedLevelOneTypes = posGroups.find(group => group.prefix === 'teAka')?.options
    .filter(type => LEVEL_ONE_WORD_TYPES.includes(type.label.toLowerCase())).map(type => `teAka:${type.code}`) ?? []
  const posFilter = level === 1 && kind === 'word' && metadata?.level === level
    && selectedType !== 'browse:numbers' && !allowedLevelOneTypes.includes(selectedType) ? '' : selectedType
  const visible = scoped.filter(entry => {
    if (posFilter === 'browse:numbers') return vocabularyNumberValue(entry.text) !== undefined
    if (posFilter) {
      const [field, ...rest] = posFilter.split(':')
      const code = rest.join(':')
      if (field === 'function') { if (entry.functionType !== code) return false }
      else if (!entry.key || !posByWord.get(entry.key)?.[field as 'teAka' | 'broadPos' | 'specificPos']?.some(pos => pos.code === code)) return false
    }
    return true
  })
  if (posFilter === 'browse:numbers') visible.sort((a, b) => vocabularyNumberValue(a.text)! - vocabularyNumberValue(b.text)! || a.text.length - b.text.length)
  const expressionOnly = kind !== 'word'
  const hasFilters = Boolean(posFilter)
  const clearFilters = () => { setPosFilter('') }
  const wordTypes = (posGroups.find(group => group.prefix === 'teAka')?.options ?? []).filter(type => level !== 1 || LEVEL_ONE_WORD_TYPES.includes(type.label.toLowerCase()))
    .sort((a, b) => level === 1 ? LEVEL_ONE_WORD_TYPES.indexOf(a.label.toLowerCase()) - LEVEL_ONE_WORD_TYPES.indexOf(b.label.toLowerCase()) : a.label.localeCompare(b.label))
  const typePrefix = expressionOnly ? 'function:' : 'teAka:'
  const typeOptions = expressionOnly ? posGroups[0].options : wordTypes
  const typeTabs = [{ code: '', label: expressionOnly ? 'All' : 'All words', legendCode: '' }, ...typeOptions.map(type => ({ code: !expressionOnly && type.label.toLowerCase() === 'numeral' ? 'browse:numbers' : `${typePrefix}${type.code}`, label: pluralWordType(type.label), legendCode: expressionOnly ? '' : type.code }))]
  const firstBigWord = sentences && courseBigWords(sentences, level)[0]?.examples[0]
  const bigWordSymbol = firstBigWord && sentences ? bigWordPosCodes(firstBigWord, sentences)[0] : undefined
  const kindOptions = [ ['big', 'Big words'], ['word', 'Words'], ['phrase', 'Phrases'] ] as const

  return <section className="site-card level-vocabulary" aria-label={`Level ${level} vocabulary`}>
    <div className="level-vocabulary-tools">
    <div className="level-vocabulary-kind" role="group" aria-label="Vocabulary kind">
      {kindOptions.map(([value, label]) => <button type="button" key={value} aria-pressed={kind === value}
        onClick={() => { setKind(value); setPosFilter('') }}>
        {value === 'big' ? (bigWordSymbol ? legend(bigWordSymbol, 'specific') : null) : <span className="moe-benefit-icon"><VocabularyKindIcon kind={value} /></span>}{label}{value !== 'big' && <span>{entries.filter(entry => belongsToKind(entry, value)).length}</span>}
      </button>)}
    </div>
    </div>
    {kind === 'big' ? <LevelBigWords level={level} sentences={sentences} nounCatalog={nounCatalog} rail={(example, label, withText, after) => {
      const sentence = example.structureId == null ? LEVEL_READING_ANNOTATIONS.find(item => item.textMi === example.textMi) : sentences?.find(item => item.structureId === example.structureId && item.textMi === example.textMi)
      if (!sentence?.state || !catalog) return null
      const context = after && sentences?.find(item => item.structureId === after.structureId && item.textMi === after.textMi)
      const plans = requestRails({ kind: 'specimen', after: context?.state && after ? after.indices.map(index => context.state!.tokens[index]) : undefined, text: sentence.textMi, state: sentence.state,
        families: new Map(catalog.posTypes.map(type => [type.posCode, type.groupCode])), library, rules,
        indices: example.indices, label, withText, continuousRail: withText })
      return plans.map((plan, index) => {
        const internal = plan.internalMaterial
        const face = plan.specimenFace
        const visual = <span className="level-big-word-engine-rail" style={{ backgroundColor: plan.materialColor }}>
          {plan.specimenLeftFace && <span style={{ position: 'absolute', right: '100%', top: 0 }}><SavedConnectorCheckpoint plan={plan.specimenLeftFace} displayHeight={18} /></span>}
          {internal && <>
            <span style={{ position: 'absolute', inset: `0 0 0 ${internal.fraction * 100}%`, backgroundColor: internal.color }} />
            <span style={{ position: 'absolute', left: `${internal.fraction * 100}%`, transform: 'translateX(-50%)', top: 0 }}><SavedConnectorCheckpoint plan={internal.face} displayHeight={18} /></span>
          </>}
          {face && <span style={{ position: 'absolute', left: '100%', top: 0, zIndex: 1 }}><SavedConnectorCheckpoint plan={face} displayHeight={18} /></span>}
        </span>
        return withText ? <span key={index} className="level-big-word-following-token" style={plan.specimenLeftFace ? { marginLeft: 18 } : undefined}><span className="level-big-word-following-rail" aria-hidden="true">{visual}</span>{plan.text}</span> : <span key={index}>{visual}</span>
      })
    }} /> : <>
    {typeOptions.length > 0 && <div className={`level-vocabulary-types ${expressionOnly ? '' : 'level-vocabulary-skill-choices'}`} role="tablist" aria-label={expressionOnly ? "Expression types" : "Word types"}>
      {typeTabs.map((type, index) => <button type="button" role="tab" key={type.code}
        id={`vocabulary-type-${index}`} aria-controls="vocabulary-word-list"
        aria-selected={posFilter === type.code || (!posFilter && index === 0)} tabIndex={posFilter === type.code || (!posFilter && index === 0) ? 0 : -1}
        onClick={() => setPosFilter(type.code)}
        onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % typeTabs.length
            : event.key === 'ArrowLeft' ? (index - 1 + typeTabs.length) % typeTabs.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? typeTabs.length - 1 : -1
          if (next < 0) return
          event.preventDefault()
          setPosFilter(typeTabs[next].code)
          document.getElementById(`vocabulary-type-${next}`)?.focus()
        }}>{type.legendCode ? <span className="level-vocabulary-skill-symbol">{legend(type.legendCode, 'dictionary')}</span> : null}<span>{type.label}</span></button>)}
    </div>}
    <div id="vocabulary-word-list" role={typeOptions.length ? 'tabpanel' : undefined}
      aria-labelledby={typeOptions.length ? `vocabulary-type-${Math.max(0, typeTabs.findIndex(type => type.code === posFilter))}` : undefined}>
    {failed === level && !expressionOnly ? <p className="level-vocabulary-error" role="alert">Word information could not be loaded. <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p> : null}
    {visible.length > 0 ? <div className="level-vocabulary-table-wrap" tabIndex={0} role="region" aria-label="Vocabulary table">
    <table aria-label={`Level ${level} vocabulary`} className={expressionOnly ? 'level-vocabulary-expression-table' : undefined}>
      <thead><tr><th scope="col">Māori</th><th scope="col">English</th>
        {expressionOnly ? <th scope="col">Type</th> : <><th scope="col" title="Recorded POS labels across the word’s Te Aka readings">Te Aka POS</th><th scope="col">Broad POS</th><th scope="col">Specific POS</th></>}
        <th scope="col" title="Recorded categories across this word’s uses">Category</th></tr></thead>
      <tbody>{visible.map(item => <tr key={item.id} data-entry-kind={item.kind}>
        <th scope="row"><span lang="mi" id={item.id === entries.find(entry => entry.id.startsWith('kiwaha:'))?.id ? 'level-kiwaha-title' : item.id === entries.find(entry => entry.example)?.id ? 'level-reading-language-title' : undefined}>{item.text}</span>

        </th>
        <td className="level-vocabulary-meaning">{item.english}</td>
        {expressionOnly ? <td data-label="Type">{item.functionType ?? '—'}</td> : item.kind === 'word' ? <>
          <td><DictionaryPos level={level} value={posByWord.get(item.key!)} failed={failed === level} legend={legend} /></td>
          <td><InternalPos level={level} value={posByWord.get(item.key!)?.broadPos} failed={failed === level} legend={legend} kind="broad" /></td>
          <td><InternalPos level={level} value={posByWord.get(item.key!)?.specificPos} failed={failed === level} legend={legend} kind="specific" />
            {item.functionType && <small className="level-vocabulary-function" title="Function in this course example">{item.functionType}</small>}
          </td>
        </> : <td colSpan={3}><span className="level-vocabulary-function">{item.functionType ?? '—'}</span></td>}
        <td data-label={expressionOnly ? 'Category' : undefined}>{item.kind === 'word' ? <Categories value={posByWord.get(item.key!)?.categories} failed={failed === level} /> : item.category ?? '—'}</td>
      </tr>)}</tbody>
    </table>
    </div> : <div className="level-vocabulary-empty"><p>{hasFilters ? 'No matching entries.' : `No ${kind === 'phrase' ? 'phrases' : 'words'} in this level yet.`}</p>{hasFilters && <button type="button" onClick={clearFilters}>Show all</button>}</div>}
    </div>
    </>}
  </section>
}

function EmptyPos({ loading, failed }: { loading?: boolean; failed?: boolean }) {
  return <span className="level-vocabulary-pos-empty" aria-label={failed ? 'Unavailable' : loading ? 'Loading POS' : 'No recorded POS'}>{failed ? 'Unavailable' : loading ? '…' : '—'}</span>
}

type Legend = (code: string, kind: PosLegendKind) => ReactNode

function DictionaryPos({ value, failed, legend, level }: { level: CurriculumLevel; value?: VocabularyPos; failed: boolean; legend: Legend }) {
  if (!value || !value.teAka.length) return <EmptyPos loading={!value} failed={failed} />
  const labels = [...new Map(value.teAka.map(pos => [pos.code, pos])).values()].filter(pos => level !== 1 || !ADVANCED_LEVEL_ONE_LABEL.test(pos.label))
  if (!labels.length) return <span aria-label="Not introduced at this level">—</span>
  return <ul className="level-vocabulary-pos">{labels.map(pos => <li key={pos.code}>
    {legend(pos.code, 'dictionary')}
    {pos.url?.startsWith('https://') ? <a href={pos.url} target="_blank" rel="noreferrer" aria-label={`${pos.label} — Te Aka entry for ${value.word}`}>{pos.label}</a> : pos.label}
  </li>)}</ul>
}

function InternalPos({ value, failed, legend, kind, level }: { level: CurriculumLevel; value?: VocabularyPos['specificPos']; failed: boolean; legend: Legend; kind: 'broad' | 'specific' }) {
  if (!value || !value.length) return <EmptyPos loading={!value} failed={failed} />
  const labels = value.filter(pos => level !== 1 || !ADVANCED_LEVEL_ONE_LABEL.test(pos.label))
  if (!labels.length) return <span aria-label="Not introduced at this level">—</span>
  return <ul className="level-vocabulary-pos">{labels.map(pos => <li key={pos.code}>
    {legend(pos.code, kind)}{pos.label}<small title={pos.status === 'unreviewed' ? 'Existing word-level assignment that has not been confirmed through review.' : 'Recorded in confirmed word knowledge.'}>{pos.status === 'unreviewed' ? 'Unreviewed' : 'Confirmed'}</small>
  </li>)}</ul>
}

function Categories({ value, failed }: { value?: VocabularyPos['categories']; failed: boolean }) {
  if (!value || !value.length) return <span className="level-vocabulary-pos-empty" aria-label={failed ? 'Unavailable' : !value ? 'Loading category' : 'No recorded category'}>{failed ? 'Unavailable' : !value ? '…' : 'Not assigned'}</span>
  return <ul className="level-vocabulary-pos">{value.map(category => <li key={category.code}>{category.label}</li>)}</ul>
}

function pluralWordType(label: string): string {
  const plurals: Record<string, string> = { greeting: 'Greetings', farewell: 'Farewells', 'sentence starter': 'Sentence starters', 'time adverbial': 'Time adverbials', noun: 'Nouns', pronoun: 'Pronouns', determiner: 'Determiners', particle: 'Particles', verb: 'Verbs', adjective: 'Adjectives', adverb: 'Adverbs', preposition: 'Prepositions', conjunction: 'Conjunctions', interjection: 'Interjections', numeral: 'Numbers', modifier: 'Modifiers', stative: 'Statives', 'personal noun': 'Names', 'simple noun': 'Simple nouns', location: 'Locations' }
  return plurals[label.toLowerCase()] ?? label
}

function VocabularyKindIcon({ kind }: { kind: VocabularyEntryKind }) {
  return <svg className="level-vocabulary-kind-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'word' ? <><path d="M5 3h14v18H5zM8 7h8M8 11h6M8 15h8" /></>
      : <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-6 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M7 9h10M7 13h7" />}
  </svg>
}

// These control the learner-facing navigation only, never stored POS or tagging.
const LEVEL_ONE_WORD_TYPES = ['particle', 'numeral', 'determiner', 'noun', 'personal noun', 'pronoun']
const ADVANCED_LEVEL_ONE_LABEL = /stative|passive|verb/i
