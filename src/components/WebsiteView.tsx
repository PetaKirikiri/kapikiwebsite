import { useEffect, useMemo, useState } from 'react'
import type { BusManifestSheet } from '../lib/busManifestContract'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import type { ReviewDeskPosCatalog, SavedBusManifest } from '../lib/busManifestTeam/reviewDeskGateway'
import type { BusManifestUserWrite } from './BusManifestReviewView'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { unresolvedSentence as blankSheet, tagText } from '../lib/connectorPresentation/engine'
import './WebsiteView.css'
import { translatedSegments } from '../lib/connectorPresentation/translation'
import type { CSSProperties } from 'react'

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
type StorySupport = 0 | 1 | 2 | 3

type StoryPreview = {
  readonly fullMaori: string
  readonly keyWords: string
  readonly extraHelp: string
}

const STORY_SUPPORT_LABELS = ['Extra help', 'Key words', 'Patterns', 'Full Māori'] as const

const LEVEL_STORIES: Record<CurriculumLevel, StoryPreview> = {
  1: {
    fullMaori: 'I tēnei rā, ko Maia te kaiako. He whare nui tōna kura. Kei te kura ngā tamariki.',
    keyWords: 'I this day, ko Maia te teacher. He house big tōna school. Kei te school ngā children.',
    extraHelp: 'Located this day, is Maia the teacher. A house big her school. At the school the children.',
  },
  2: {
    fullMaori: 'I tēnei ata, kei te oma te tama ki te awa. Ka kite ia i tētahi manu, ā, ka tū ia.',
    keyWords: 'I tēnei morning, kei te run te boy ki te river. Ka see ia i tētahi bird, ā, ka stop ia.',
    extraHelp: 'This morning, kei te run te boy to the river. Then see ia a bird, and then stop ia.',
  },
  3: {
    fullMaori: 'Kāore te kōtiro i kite i te kurī. Kua oma kē te kurī ki muri i te whare.',
    keyWords: 'Kāore te girl i see i te dog. Kua run kē te dog ki muri i te house.',
    extraHelp: 'The girl did not see the dog. Already, kua run te dog behind the house.',
  },
  4: {
    fullMaori: 'Nā Mere te kete, engari nō Hemi te waka. Mā rāua ngā kai e hari ki te kāinga.',
    keyWords: 'Nā Mere te basket, engari nō Hemi te car. Mā rāua ngā food e carry ki te home.',
    extraHelp: 'Mere owns the basket, but Hemi owns the car. Together, mā rāua ngā food e carry home.',
  },
  5: {
    fullMaori: 'He aha te take i hoki ai te whānau? I karangatia rātou e tō rātou kuia.',
    keyWords: 'He aha te reason i return ai te family? I call-passive rātou e tō rātou grandmother.',
    extraHelp: 'Why did the family return? They were called back by their grandmother.',
  },
  6: {
    fullMaori: 'Mēnā ka tae mai te ua, ka noho mātou ki roto. Ki te paki te rangi āpōpō, ka haere tonu te hīkoi.',
    keyWords: 'Mēnā ka arrive te rain, ka stay mātou inside. Ki te clear te sky tomorrow, ka continue te walk.',
    extraHelp: 'If the rain arrives, we will stay inside. If the sky is clear tomorrow, we will continue the walk.',
  },
}


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
  const [storySupport, setStorySupport] = useState<StorySupport>(2)

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
    setStorySupport(2)
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
  const story = LEVEL_STORIES[selectedLevel]
  const storyText = storySupport === 0
    ? story.extraHelp
    : storySupport === 1
    ? story.keyWords
    : storySupport === 2
    ? story.fullMaori
    : story.fullMaori
  const [storyAnalysis, setStoryAnalysis] = useState<{ text: string; states: readonly BusManifestSheet[] } | null>(null)
  const [storyError, setStoryError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setStoryError(null)
    const sentences = story.fullMaori.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map(text => text.trim()) ?? []
    void Promise.all(sentences.map(text => tagText(text, controller.signal)))
      .then(states => { if (!controller.signal.aborted) setStoryAnalysis({ text: story.fullMaori, states }) })
      .catch((error: unknown) => { if (!controller.signal.aborted) setStoryError(error instanceof Error ? error.message : 'Story analysis unavailable.') })
    return () => controller.abort()
  }, [story.fullMaori])
  const storyStates = storySupport === 2 && storyAnalysis?.text === storyText
    ? storyAnalysis.states
    : (storyText.match(/[^.!?]+[.!?]+|[^.!?]+$/gu) ?? []).map(blankSheet)
  const storySentences = storyStates.map((storyState, sentenceIndex) => {
    const textMi = storyState.tokens.map((token) => token.surfaceText).join(' ')
    return {
      sentence: {
        structureId: 100_000 + selectedLevel * 10 + sentenceIndex,
        sortOrder: sentenceIndex,
        textMi,
        curriculumLevel: selectedLevel,
        state: storyState,
      } satisfies WebsitePreviewSentence,
      state: storyState,
    }
  })

  return (
    <section aria-label="Website" data-testid="website-workspace" className="maori-site">
      <header className="site-header">
        <a href="#website-top" className="site-wordmark">Māori<span>by Colours</span></a>
        <nav aria-label="Website navigation"><a href="#join" className="site-nav-join">Join the class</a></nav>
      </header>

      <section id="website-top" className="site-intro">
        <div>
          <h1>Find your level.</h1>
        </div>
      </section>

      <section id="level-finder" className="site-learning">
        {error != null ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
        {data == null && error == null ? (
          <div role="status" className="rounded-[2rem] bg-slate-950 px-6 py-14 text-center font-bold text-white">Loading levels…</div>
        ) : null}

        {data != null ? <>
          <div className="site-level-layout">
            <aside className="site-level-nav" aria-label="Choose your level">
              <div className="site-level-buttons">{([1, 2, 3, 4, 5, 6] as const).map(level => <button key={level} type="button" aria-pressed={selectedLevel === level} onClick={() => changeLevel(level)}><span className="site-level-number">0{level}</span><span>Level {level}</span><span className="site-level-arrow" aria-hidden="true">↗</span></button>)}</div>
            </aside>
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

          <section aria-label={`Level ${selectedLevel} story`} className="site-story">
            <div className="site-story-heading">
              <h2>Read a story.</h2>
            </div>
            <div className="site-story-reading">
            <div className="site-support" aria-label="Story reading support">{STORY_SUPPORT_LABELS.map((label, index) => <button key={label} type="button" aria-pressed={storySupport === index} onClick={() => setStorySupport(index as StorySupport)}>{label}</button>)}</div>
            <div className="site-story-content">
              {storySupport === 2 && storyError ? <p role="alert">{storyError}</p> : null}
              {storySupport === 2 && !storyError && storyAnalysis?.text !== storyText ? <p role="status">Analysing the Māori text…</p> : null}
              <div className="min-w-0 overflow-hidden pb-1">
                <FamilyConnectorSentenceView
                  loading={false}
                  paragraphs={storySentences.map(({ sentence }) => renderUnassessedPassage(sentence.textMi))}
                  savedBusManifests={storySentences.map(({ sentence, state }) => demoManifest(sentence, state))}
                  posCatalog={data.catalog}
                  passageAddresses={storySentences.map(({ sentence }) => ({ structureId: sentence.structureId }))}
                  onBusManifestWrite={() => undefined}
                  showPassageSearch={false}
                  showPassageLabel={false}
                  readOnly
                  continuousParagraph
                />
              </div>
            </div>
            </div>
          </section>
        </> : null}
      </section>

      {data != null ? <section id="join" className="site-join">
        <h2>Join the class.</h2>
        <div className="site-join-action"><button type="button">Save my place <span aria-hidden="true">↗</span></button></div>
      </section> : null}
    </section>
  )
}
