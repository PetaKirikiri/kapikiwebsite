import { useMemo } from 'react'
import type { WebsitePreviewData } from './WebsiteView'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import SentenceTranslation from './SentenceTranslation'
import { LEVEL_READING_ANNOTATIONS } from '../lib/levelReadingAnnotations'

const noWrite = () => {}

export function CoursePreviewExample({ data, textMi, textEn }: {
  data?: WebsitePreviewData | null; textMi: string; textEn: string
}) {
  const saved = data?.sentences.find(item => item.textMi === textMi)?.state
  const state = saved ?? LEVEL_READING_ANNOTATIONS.find(item => item.textMi === textMi)?.state
  const matches = state?.tokens.map(token => token.surfaceText).join(' ') === textMi
  return <div className="moe-course-example">
    {data && state && matches ? <FamilyConnectorSentenceView displaySize="compact" loading={false} continuousRail
      paragraphs={[renderUnassessedPassage(textMi)]} savedBusManifests={[]}
      presentationStates={[state]} passageAddresses={[]} posCatalog={data.catalog} onBusManifestWrite={noWrite}
      showPassageSearch={false} showPassageLabel={false} showPosTags={false} readOnly
      renderPassageSupplement={(_index, materials, joins) => <SentenceTranslation
        text={textMi} materials={materials} joins={joins} fallback={textEn} className="moe-skill-translation" />} />
      : <><p className="moe-example-maori" lang="mi">{textMi}</p><p className="moe-skill-translation" lang="en">{textEn}</p></>}
  </div>
}

export default function CourseSkillExample({ data, level, structureId, fallback }: {
  data?: WebsitePreviewData | null; level: number; structureId: number; fallback: string
}) {
  const sentence = data?.sentences.find(item => item.structureId === structureId && item.curriculumLevel === level)
  const display = useMemo(() => sentence?.state ? {
    paragraphs: [renderUnassessedPassage(sentence.textMi)],
    addresses: [{ structureId: sentence.structureId }],
    manifests: [{ savedAt: 'website-preview', stateFingerprint: `website-preview-${sentence.structureId}`,
      sourceOrderIndex: sentence.sortOrder, paragraphText: sentence.textMi,
      sourceAddress: { structureId: sentence.structureId }, state: sentence.state }],
  } : null, [sentence])
  if (!display || !data) return <span className="moe-skill-pattern">{fallback}</span>
  return <div className="moe-skill-example">
    <FamilyConnectorSentenceView displaySize="compact" loading={false}
      paragraphs={display.paragraphs} savedBusManifests={display.manifests}
      passageAddresses={display.addresses} posCatalog={data.catalog} onBusManifestWrite={noWrite}
      showPassageSearch={false} showPassageLabel={false} showPosTags={false}
      renderPassageSupplement={(_index, materials, joins) => <SentenceTranslation
        text={sentence!.textMi} materials={materials} joins={joins} className="moe-skill-translation" />}
      readOnly />
  </div>
}
