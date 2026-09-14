import { useEffect, useMemo, useState } from 'react'
import type { BusManifestSheet } from '../lib/busManifestContract'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { ReviewDeskPosCatalog, SavedBusManifest } from '../lib/busManifestTeam/reviewDeskGateway'
import type { BusManifestUserWrite } from './BusManifestReviewView'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { unresolvedSentence as blankSheet } from '../lib/connectorPresentation/engine'
import './WebsiteView.css'
import StudentPortal from './studentPortal/StudentPortal'
import { translatedSegments } from '../lib/connectorPresentation/translation'
import type { CSSProperties } from 'react'
import KaPikiWordmark from './KaPikiWordmark'

export type WebsitePreviewSentence = {
  readonly structureId: number
  readonly sortOrder: number
  readonly textMi: string
  readonly curriculumLevel: number | null
  readonly state: BusManifestSheet | null
}

export type WebsitePreviewData = {
  readonly sentences: readonly WebsitePreviewSentence[]
  readonly catalog: ReviewDeskPosCatalog
}

type WebsiteViewProps = {
  /**
   * The main local app supplies its already-connected Review Desk snapshot.
   * Omit this prop only for the isolated Website preview entry point.
   */
  readonly localData?: WebsitePreviewData | null
  readonly localError?: string | null
}

type CurriculumLevel = 1 | 2 | 3 | 4 | 5 | 6


function demoManifest(
  sentence: WebsitePreviewSentence,
  state: BusManifestSheet,
  displayOrderIndex = sentence.sortOrder,
): SavedBusManifest {
  return {
    savedAt: 'website-preview',
    stateFingerprint: `website-preview-${sentence.structureId}`,
    sourceOrderIndex: displayOrderIndex,
    paragraphText: sentence.textMi,
    sourceAddress: { structureId: sentence.structureId },
    state,
  }
}

export default function WebsiteView({
  localData,
  localError = null,
}: WebsiteViewProps = {}) {
  const connectedLocally = localData !== undefined
  const [fetchedData, setFetchedData] = useState<WebsitePreviewData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [localStates, setLocalStates] = useState<ReadonlyMap<number, BusManifestSheet>>(new Map())
  const [selectedLevel, setSelectedLevel] = useState<CurriculumLevel>(1)
  const [accountOpen, setAccountOpen] = useState(() => ['#account', '#join'].includes(window.location.hash))
  const [activeSection, setActiveSection] = useState(() => window.location.hash || '#level-finder')
  useEffect(() => {
    const openAccount = () => {
      setActiveSection(window.location.hash || '#level-finder')
      if (['#account', '#join'].includes(window.location.hash)) setAccountOpen(true)
    }
    window.addEventListener('hashchange', openAccount)
    return () => window.removeEventListener('hashchange', openAccount)
  }, [])

  useEffect(() => {
    if (connectedLocally) return
    const controller = new AbortController()
    void fetch('/__website_preview_data', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The course examples could not load (${response.status}).`)
        return response.json() as Promise<WebsitePreviewData>
      })
      .then(setFetchedData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setFetchError(cause instanceof Error ? cause.message : 'The course examples could not load.')
        }
      })
    return () => controller.abort()
  }, [connectedLocally])

  const data = connectedLocally ? localData : fetchedData
  const error = connectedLocally ? localError : fetchError

  const states = useMemo(() => {
    const next = new Map<number, BusManifestSheet>()
    data?.sentences.forEach((sentence) => {
      next.set(sentence.structureId, localStates.get(sentence.structureId) ?? sentence.state ?? blankSheet(sentence.textMi))
    })
    return next
  }, [data, localStates])

  const handleLocalWrite = (write: BusManifestUserWrite) => {
    setLocalStates((current) => {
      const next = new Map(current)
      next.set(write.sourceAddress.structureId, write.state)
      return next
    })
  }

  const changeLevel = (nextLevel: CurriculumLevel) => {
    const scrollTop = window.scrollY
    setSelectedLevel(nextLevel)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollTop)
    }))
  }

  const levelSentences = data?.sentences.filter((sentence) => sentence.curriculumLevel === selectedLevel) ?? []
  const courseOrderByStructureId = useMemo(() => {
    const ordered = data?.sentences
      .filter((sentence) => sentence.curriculumLevel != null)
      .slice()
      .sort((left, right) => (left.curriculumLevel! - right.curriculumLevel!) || (left.sortOrder - right.sortOrder)) ?? []
    return new Map(ordered.map((sentence, index) => [sentence.structureId, index]))
  }, [data])

  return (
    <section id="website-top" aria-label="Website" data-testid="website-workspace" className="maori-site">
      <header className="site-header">
        <a href="#website-top" className="site-wordmark" aria-label="Ka Piki"><KaPikiWordmark /></a>
        <nav aria-label="Website navigation" className="site-nav">
          {[
            ['#level-finder', 'Levels'],
          ].map(([href, label]) => {
            const active = activeSection === href || ['#website-top', '#methodology', '#teacher'].includes(activeSection)
            return <a key={href} href={href} aria-current={active ? 'location' : undefined} className={`site-nav-item${active ? ' site-nav-item-active' : ''}`}>{label}</a>
          })}
        </nav>
      </header>

      <section id="level-finder" className="site-learning">
        <header className="site-level-header">
          <h1>Find your level.</h1>
          <nav className="site-level-nav" aria-label="Choose your level">
            <div className="site-level-buttons">{([1, 2, 3, 4, 5, 6] as const).map(level => <button key={level} type="button" aria-label={`Level ${level}`} aria-pressed={selectedLevel === level} disabled={data == null} onClick={() => changeLevel(level)}>{level}</button>)}</div>
          </nav>
        </header>
        {error != null ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
        {data == null && error == null ? (
          <p role="status" className="site-loading">Loading levels…</p>
        ) : null}

        {data != null ? <>
          <div className="site-level-layout">
            <div className="site-sentence-panel">
            <div className="site-sentences" aria-label={`Level ${selectedLevel} sentence structures`}>
              {levelSentences.length === 0 ? <p className="px-3 py-6 text-slate-600">No sentence structures assigned to this level yet.</p> :
              <FamilyConnectorSentenceView
                key={selectedLevel}
                loading={false}
                paragraphs={levelSentences.map((sentence) => renderUnassessedPassage(sentence.textMi))}
                savedBusManifests={levelSentences.map((sentence) => demoManifest(sentence,
                  states.get(sentence.structureId) ?? blankSheet(sentence.textMi),
                  courseOrderByStructureId.get(sentence.structureId) ?? sentence.sortOrder))}
                posCatalog={data.catalog}
                passageAddresses={levelSentences.map((sentence) => ({ structureId: sentence.structureId }))}
                onBusManifestWrite={handleLocalWrite}
                showPassageSearch={false}
                showPassageLabel={false}
                showStructureNotes
                collapsibleStructureNotes
                renderPassageSupplement={(index, materials, joins) => {
                  const segments = translatedSegments(levelSentences[index]!.textMi, materials, joins)
                  return <div className="site-translation" lang="en" aria-label="English translation">
                    {segments ? segments.map((segment, part) => <span key={part}>
                      {part > 0 && !segment.connectedBefore ? ' ' : null}<span title={segment.sourceText ? `Matches: ${segment.sourceText}` : undefined}>
                        {segment.parts.map((piece, pieceIndex) => <span key={pieceIndex} className={piece.color ? 'site-translation-match' : undefined}
                          style={piece.color ? { '--translation-color': piece.color } as CSSProperties : undefined}>{pieceIndex === 0 && segment.connectedBefore ? ' ' : null}{piece.text}</span>)}
                      </span>
                    </span>) : <span>Translation not yet available.</span>}
                  </div>
                }}
                readOnly
              />}
            </div>
            </div>
          </div>

        </> : null}
      </section>

      <StudentPortal level={selectedLevel} open={accountOpen} onClose={() => { setAccountOpen(false); if (['#account', '#join'].includes(window.location.hash)) { window.history.replaceState(null, '', window.location.pathname + window.location.search); setActiveSection('#level-finder') } }} />
    </section>
  )
}
