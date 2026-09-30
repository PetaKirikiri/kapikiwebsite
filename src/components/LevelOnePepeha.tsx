import { useEffect, useMemo, useState, type ReactNode } from 'react'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import SentenceTranslation from './SentenceTranslation'
import { tagText, unresolvedSentence } from '../lib/connectorPresentation/engine'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { BusManifestSheet, BusManifestPosCatalog } from '../lib/busManifestContract'
import { READING_LANGUAGE } from '../lib/courseReadingLanguage'
import type { ReadingLine, ReadingMaterialContent } from '../lib/levelReadingMaterial'
import { LEVEL_ONE_READING } from '../lib/levelOneReadingMaterial'
import { readingKiwaha } from '../lib/courseKiwaha'
import './SiteIdentity.css'
import './LevelOnePepeha.css'

const PEPEHA = LEVEL_ONE_READING
const NO_WRITES = () => {}

type Analysis = { state: BusManifestSheet | null; failed: boolean }
type SavedSentence = { readonly textMi: string; readonly state: BusManifestSheet | null }
const NO_SAVED_SENTENCES: readonly SavedSentence[] = []

function savedState(sentences: readonly SavedSentence[], text: string): BusManifestSheet | null {
  const state = sentences.find(sentence => sentence.textMi === text)?.state
  if (!state || state.tokens.map(token => token.surfaceText).join(' ') !== text) return null
  return state
}

function PepehaCard({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return <div className="site-card level-pepeha-card">
    <header className="site-card-cover level-pepeha-cover level-pepeha-card-heading">{heading}</header>
    <div className="level-pepeha-lines">{children}</div>
  </div>
}

type ReadingProps = { catalog?: BusManifestPosCatalog; sentences?: readonly SavedSentence[]; moe?: boolean }

export default function LevelOnePepeha(props: ReadingProps) {
  return <LevelReadingMaterial reading={PEPEHA} {...props} />
}

/** The same read-only reading cards and sentence renderer at every level. */
export function LevelReadingMaterial({ reading, catalog, sentences = NO_SAVED_SENTENCES, moe = false }: ReadingProps & { reading: ReadingMaterialContent }) {
  const lines = useMemo(() => [...new Map(reading.sections.flatMap(section => section.lines).map(line => [line[0], line])).values()], [reading])
  const languageIds = new Set(lines.flatMap(line => line[3]?.language ?? []))
  const language = READING_LANGUAGE.filter(entry => languageIds.has(entry.id))
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  useEffect(() => {
    if (!catalog) return
    const controller = new AbortController()
    let next = 0
    // Limit requests while each sentence keeps its own read-only analysis boundary.
    async function worker() {
      while (next < lines.length && !controller.signal.aborted) {
        const [mi, , , curriculum] = lines[next++]!
        if (curriculum?.kiwahaId) continue
        if (savedState(sentences, mi)) continue
        try {
          const state = await tagText(mi, controller.signal)
          if (!controller.signal.aborted) setAnalyses(current => ({ ...current, [mi]: { state, failed: false } }))
        } catch {
          if (!controller.signal.aborted) setAnalyses(current => ({ ...current, [mi]: { state: null, failed: true } }))
        }
      }
    }
    void worker()
    void worker()
    return () => controller.abort()
  }, [sentences, lines, catalog])

  function sentence([mi, en, speaker, curriculum]: ReadingLine, index: number) {
    const kiwaha = readingKiwaha(curriculum?.kiwahaId)
    if (kiwaha) return <div className="level-pepeha-line" key={`${index}-${mi}`}>
      {speaker && <span className="level-reading-speaker">{speaker}</span>}
      <p className="level-pepeha-plain" lang="mi">{mi}</p>
      <p className="level-pepeha-translation" lang="en">{en}</p>
      <a className="level-reading-kiwaha" href={`#${moe ? 'moe/' : ''}levels/${kiwaha.level}?tab=vocabulary&section=kiwaha`}>Kīwaha · Level {kiwaha.level}</a>
    </div>
    const state = savedState(sentences, mi) ?? analyses[mi]?.state ?? unresolvedSentence(mi)
    // Unanalysed text has no drawable grammar. Avoid reserving an empty rail row.
    if (!catalog || !state.tokens.some(token => token.acceptedPosCode != null)) return <div className="level-pepeha-line" key={`${index}-${mi}`}>
      {speaker && <span className="level-reading-speaker">{speaker}</span>}
      <p className="level-pepeha-plain" lang="mi">{mi}</p>
      <p className="level-pepeha-translation" lang="en">{en}</p>
    </div>
    return <div className="level-pepeha-line" key={`${index}-${mi}`}>
      {speaker && <span className="level-reading-speaker">{speaker}</span>}
      <FamilyConnectorSentenceView loading={false} paragraphs={[renderUnassessedPassage(mi)]}
        savedBusManifests={[]} presentationStates={[state]} passageAddresses={[]}
        posCatalog={catalog} onBusManifestWrite={NO_WRITES} showPassageLabel={false}
        showPassageSearch={false} readOnly
        renderPassageSupplement={(_index, materials, joins) => <SentenceTranslation text={mi} materials={materials} joins={joins} fallback={en} className="level-pepeha-translation" />} />
    </div>
  }

  return <section className="level-pepeha" aria-label={reading.title}>
    <ol className="level-pepeha-sections">
      {reading.sections.map(({ title, meaning, lines }, index) => <li key={title} id={`${reading.id}-section-${index + 1}`} tabIndex={-1}>
        <PepehaCard heading={<div className="level-pepeha-section-label">
          {reading.sections.length > 1 && <span className="level-pepeha-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
          <div><h3 lang="mi">{title}</h3><p>{meaning}</p></div>
        </div>}>{lines.map(sentence)}</PepehaCard>
      </li>)}
    </ol>
    {language.length > 0 && <nav className="level-reading-language" aria-label="Time and linking words in this story">
      <span>Time &amp; linking words</span>
      {language.map(entry => <a key={entry.id} lang="mi" href={`#${moe ? 'moe/' : ''}levels/${entry.level}?tab=vocabulary&section=reading-language`} aria-label={`${entry.text} — Level ${entry.level} vocabulary`}>{entry.text}</a>)}
    </nav>}
  </section>
}
