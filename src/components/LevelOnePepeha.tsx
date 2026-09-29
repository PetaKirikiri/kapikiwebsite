import { useEffect, useMemo, useState, type ReactNode } from 'react'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import SentenceTranslation from './SentenceTranslation'
import { tagText, unresolvedSentence } from '../lib/connectorPresentation/engine'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { BusManifestSheet, BusManifestPosCatalog } from '../lib/busManifestContract'
import type { ReadingLine, ReadingMaterialContent } from '../lib/levelReadingMaterial'
import './SiteIdentity.css'
import './LevelOnePepeha.css'

// A fictional worked example, separate from the canonical sentence roster.
// Possessive and sibling usage: https://kupu.maori.nz/possession/t-possession
// https://kupu.maori.nz/kupu/teina and https://kupu.maori.nz/kupu/tam%C4%81hine
const SECTIONS = [
  { title: 'Tūrangawaewae', meaning: 'Places I belong', lines: [
    ['Ko Ngongotahā te maunga.', 'Ngongotahā is the mountain.'],
    ['Ko Rotorua te roto.', 'Rotorua is the lake.'],
    ['Nō Rotorua ahau.', 'I am from Rotorua.'],
  ] },
  { title: 'Tūpuna', meaning: 'Ancestors', lines: [
    ['Nō Rotorua ōku tūpuna.', 'My ancestors are from Rotorua.'],
  ] },
  { title: 'Mātua', meaning: 'Parents', lines: [
    ['Ko Mere tōku whaea.', 'Mere is my mother.'],
    ['Ko Hemi tōku matua.', 'Hemi is my father.'],
  ] },
  { title: 'Tuākana, tēina', meaning: 'Siblings', lines: [
    ['Ko Hana tōku teina.', 'Hana is my younger sister.'],
  ] },
  { title: 'Tamariki', meaning: 'Children', lines: [
    ['Ko Rangi tāku tama.', 'Rangi is my son.'],
    ['Ko Aroha tāku tamāhine.', 'Aroha is my daughter.'],
  ] },
  { title: 'Mahi', meaning: 'Work', lines: [
    ['He kaiako ahau.', 'I am a teacher.'],
  ] },
  { title: 'Kāinga', meaning: 'Home', lines: [
    ['Kei Pōneke tōku kāinga.', 'My home is in Wellington.'],
  ] },
] as const

const PEPEHA: ReadingMaterialContent = { id: 'pepeha', title: 'Pepeha', sections: SECTIONS }
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

type ReadingProps = { catalog?: BusManifestPosCatalog; sentences?: readonly SavedSentence[] }

export default function LevelOnePepeha(props: ReadingProps) {
  return <LevelReadingMaterial reading={PEPEHA} {...props} />
}

/** The same read-only reading cards and sentence renderer at every level. */
export function LevelReadingMaterial({ reading, catalog, sentences = NO_SAVED_SENTENCES }: ReadingProps & { reading: ReadingMaterialContent }) {
  const lines = useMemo(() => reading.sections.flatMap(section => section.lines), [reading])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  useEffect(() => {
    if (!catalog) return
    const controller = new AbortController()
    let next = 0
    // Limit requests while each sentence keeps its own read-only analysis boundary.
    async function worker() {
      while (next < lines.length && !controller.signal.aborted) {
        const [mi] = lines[next++]!
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

  function sentence([mi, en, speaker]: ReadingLine) {
    const state = savedState(sentences, mi) ?? analyses[mi]?.state ?? unresolvedSentence(mi)
    // Unanalysed text has no drawable grammar. Avoid reserving an empty rail row.
    if (!catalog || !state.tokens.some(token => token.acceptedPosCode != null)) return <div className="level-pepeha-line" key={mi}>
      {speaker && <span className="level-reading-speaker">{speaker}</span>}
      <p className="level-pepeha-plain" lang="mi">{mi}</p>
      <p className="level-pepeha-translation" lang="en">{en}</p>
    </div>
    return <div className="level-pepeha-line" key={mi}>
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
  </section>
}
