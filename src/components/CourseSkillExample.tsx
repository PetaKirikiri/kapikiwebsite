import { useMemo } from 'react'
import type { WebsitePreviewData } from './WebsiteView'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'

const noWrite = () => {}

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
      showPassageSearch={false} showPassageLabel={false} showPosTags={false} readOnly />
  </div>
}
