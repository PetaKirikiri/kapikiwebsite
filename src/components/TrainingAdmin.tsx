import { useEffect, useState } from 'react'
import SentenceRecorder from './SentenceRecorder'
import type { WebsitePreviewData } from './WebsiteView'
import { contentForLevel, vocabularyForLevel } from '../lib/trainingContentLevels'
import { CURRICULUM_LEVELS, type CurriculumLevel } from '../lib/sentenceStructureLevels'
import { LEVEL_ONE_CONTENT } from '../lib/levelOneContent'

type VocabularyEntry = {key:string;category:string;label:string;meaning:string;level:number|null;structureId:number;sentence:string}

const CONTENT_TABS = ['Sentences', 'Vocabulary', 'Idioms', 'Kīwaha'] as const

export default function TrainingAdmin({ data, error }: { data?: WebsitePreviewData | null; error?: string | null }) {
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([])
  const [coverageError, setCoverageError] = useState('')
  const [structures, setStructures] = useState<{structureId:number;examples:number;demonstrated:number}[]>([])
  const [coverage, setCoverage] = useState<{key:string;family:string;label:string;category:string;examples:number;structures:number;status:string}[]>([])
  useEffect(() => { const controller = new AbortController(); void fetch('/__training_profile', {signal:controller.signal}).then(response => { if (!response.ok) throw new Error('Coverage unavailable'); return response.json() }).then(profile => { setVocabulary(profile.vocabulary ?? []); setCoverage(profile.coverage ?? []); setStructures(profile.structureCoverage ?? []) }).catch(() => { if (!controller.signal.aborted) setCoverageError('Coverage could not load. Reload to retry.') }); return () => controller.abort() }, [])
  const [vocabularyTab, setVocabularyTab] = useState('Nouns')
  const [recordingId, setRecordingId] = useState<number | null>(null)
  const [category, setCategory] = useState<typeof CONTENT_TABS[number]>('Sentences')
  const [level, setLevel] = useState<CurriculumLevel | null>(1)
  const [vocabularyTopic, setVocabularyTopic] = useState<string>(LEVEL_ONE_CONTENT.vocabulary[0].title)
  const recordingSentence = data?.sentences.find(sentence => sentence.structureId === recordingId)
  const rows = contentForLevel(data?.sentences ?? [], level)
  const levelStructureIds = new Set(rows.map(row => row.sentence.structureId))
  const levelStructures = structures.filter(item => levelStructureIds.has(item.structureId))
  const levelVocabulary = vocabulary.filter(item => item.level === level)
  const vocabularyTabs = levelVocabulary.length ? [...new Set(levelVocabulary.map(item => item.category))] : ['Determiners', 'Pronouns']
  const selectedVocabularyTab = vocabularyTabs.includes(vocabularyTab) ? vocabularyTab : vocabularyTabs[0]
  const vocabularyItems = [...new Map(levelVocabulary.filter(item => item.category === selectedVocabularyTab).map(item => [item.key, item])).values()]
  const vocabularyCoverage = vocabularyForLevel(rows, selectedVocabularyTab === 'Determiners' ? 'determiner' : 'pronoun').map(skill => {
    const metadata = coverage.find(item => item.key === skill.key)
    return { ...skill, label: metadata?.label ?? skill.key.split(':').slice(1).join(':'), category: metadata?.category ?? 'Forms' }
  })
  const coverageGroups = [...new Set(vocabularyCoverage.map(skill => skill.category ?? 'Other'))]
  const categoryBySkill = new Map(coverage.map(skill => [skill.key, skill.category]))
  const topic = LEVEL_ONE_CONTENT.vocabulary.find(item => item.title === vocabularyTopic)
  const topicWords = topic ? [...new Map<string, { label: string; meaning: string }>([
    ...topic.words.map(item => [item.label, item] as const),
    ...levelVocabulary.filter(item => item.category === topic.title).map(item => [item.label, item] as const),
  ]).values()] : []
  return <section className="training-admin">
    <a href="#training">← Back to practice</a>
    <header className="training-content-header"><h1>Content</h1><a href="#classroom">Classroom →</a></header>
    <nav className="training-content-tabs training-level-tabs" aria-label="Content levels">
      {CURRICULUM_LEVELS.map(item => <button key={item} type="button" aria-pressed={level === item}
        onClick={() => { setLevel(item); setRecordingId(null) }}>Level {item}</button>)}
      {data?.sentences.some(sentence => sentence.curriculumLevel == null) && <button type="button" aria-pressed={level === null}
        onClick={() => { setLevel(null); setRecordingId(null) }}>Unassigned</button>}
    </nav>
    {level === 1 && <p className="training-level-purpose"><strong>{LEVEL_ONE_CONTENT.title}</strong><span>{LEVEL_ONE_CONTENT.outcome}</span></p>}
    <nav className="training-content-tabs training-category-tabs" aria-label="Content categories">
      {CONTENT_TABS.map(tab => <button key={tab} type="button" aria-pressed={category === tab}
        onClick={() => { setCategory(tab); setRecordingId(null) }}>{tab}</button>)}
    </nav>
    <section aria-label={`${level == null ? 'Unassigned' : `Level ${level}`} ${category}`}>
    {category === 'Vocabulary' ? <>
      {level === 1 && <nav className="training-content-tabs training-vocabulary-tabs" aria-label="Level 1 vocabulary topics">
        {[...LEVEL_ONE_CONTENT.vocabulary.map(item => item.title), 'Supporting words'].map(item => <button key={item} type="button" aria-pressed={vocabularyTopic === item} onClick={() => setVocabularyTopic(item)}>{item}</button>)}
      </nav>}
      {level === 1 && topic ? <div className="training-vocabulary-focus">
        <p>{topic.focus}</p>
        {'note' in topic && <p className="training-word-sources">{topic.note}</p>}
        <div className="training-admin-table training-topic-words"><table><thead><tr><th scope="col">Word</th><th scope="col">Meaning</th></tr></thead><tbody>{topicWords.map(item => <tr key={item.label}><th scope="row" lang="mi">{item.label}</th><td>{item.meaning}</td></tr>)}</tbody></table></div>
        <p className="training-word-sources">Sources: {topic.sources.map((source, index) => <span key={source.url}>{index > 0 && ' · '}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>
      </div> : <>
      <nav className="training-content-tabs training-vocabulary-tabs" aria-label="Vocabulary categories">
        {vocabularyTabs.map(tab => <button key={tab} type="button" aria-pressed={selectedVocabularyTab === tab} onClick={() => setVocabularyTab(tab)}>{tab}</button>)}
      </nav>
      {coverageError && <p role="alert">{coverageError}</p>}
      {levelVocabulary.length > 0 ? <div className="training-admin-table"><table><thead><tr><th>Word</th><th>Meaning</th><th>Sentences</th></tr></thead><tbody>{vocabularyItems.map(item => <tr key={item.key}><th scope="row" lang="mi">{item.label}</th><td>{item.meaning}</td><td>{levelVocabulary.filter(example => example.key === item.key).map(example => <div key={example.structureId} lang="mi">{example.sentence}</div>)}</td></tr>)}</tbody></table></div> : <>
      {!data ? <p role="status">Loading vocabulary…</p> : vocabularyCoverage.length === 0 && <p className="training-content-empty">No {vocabularyTab.toLowerCase()} assigned to {level == null ? 'unassigned content' : `Level ${level}`} yet.</p>}
    <div className="training-coverage" aria-label={vocabularyTab}>
      <div className="training-coverage-groups">{coverageGroups.map(group => <details className="training-coverage-group" key={group}>
        <summary>{group}<span>{vocabularyCoverage.filter(skill => (skill.category ?? 'Other') === group).length} forms</span></summary>
        <table><thead><tr><th>Form</th><th>Examples</th><th>Structures</th></tr></thead><tbody>{vocabularyCoverage.filter(skill => (skill.category ?? 'Other') === group).map(skill => <tr key={skill.key}><th scope="row" lang="mi">{skill.label}</th><td>{skill.examples}</td><td>{skill.structures}</td></tr>)}</tbody></table>
      </details>)}</div>
    </div>
    </>}
    </>}
    </> : category !== 'Sentences' ? <p className="training-content-empty">No {category.toLocaleLowerCase()} added to {level == null ? 'unassigned content' : `Level ${level}`} yet.</p> : <>
    {error ? <p role="alert">{error}</p> : null}
    {coverageError && <p role="alert">{coverageError}</p>}
    {levelStructures.length > 0 && <details className="training-coverage"><summary>Structure coverage</summary><table><thead><tr><th>Structure</th><th>Variations demonstrated</th></tr></thead><tbody>{levelStructures.map(item => <tr key={item.structureId}><th>{data?.sentences.find(sentence => sentence.structureId === item.structureId)?.textMi}</th><td>{item.examples === 1 ? 'Variations needed' : `${item.demonstrated} / ${item.examples}`}</td></tr>)}</tbody></table></details>}
    {!data ? <p role="status">Loading sentences…</p> : rows.length === 0 ? <p className="training-content-empty">No sentences assigned to {level == null ? 'unassigned content' : `Level ${level}`} yet.</p> : <div className="training-admin-table"><table>
      <thead><tr><th scope="col">Order</th><th scope="col">Level</th><th scope="col">Target question</th><th scope="col">Correct option</th><th scope="col">Alternative option</th><th scope="col">Coverage</th><th scope="col">Practice</th><th scope="col">Audio</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.sentence.training?.questionId ?? row.sentence.structureId}><td>{index + 1}</td><td>{row.sentence.curriculumLevel ?? 'Unassigned'}</td><th scope="row" lang="mi">{row.sentence.textMi}</th><td>{row.meaning ?? 'Translation needed'}</td><td>{row.alternative ?? 'Alternative needed'}</td><td>{row.sentence.training?.skillKey ? `${categoryBySkill.get(row.sentence.training.skillKey) ?? row.sentence.training.skillKey.split(':')[0]} · ${row.sentence.training.skillKey.split(':')[1]}` : 'Structure'}</td><td>{row.active ? 'Active' : 'Not in current practice'}</td><td>{!row.sentence.training?.skillKey && <button className="sentence-record-button" onClick={() => setRecordingId(row.sentence.structureId)}>Record</button>}</td></tr>)}</tbody>
    </table></div>}
    </>}
    </section>
    {recordingSentence ? <SentenceRecorder key={recordingSentence.structureId} sentence={recordingSentence} onClose={() => setRecordingId(null)} onSaved={() => {
      const canonical = rows.filter(row => !row.sentence.training?.skillKey)
      const index = canonical.findIndex(row => row.sentence.structureId === recordingSentence.structureId)
      setRecordingId(canonical[index + 1]?.sentence.structureId ?? null)
    }} /> : null}
  </section>
}
