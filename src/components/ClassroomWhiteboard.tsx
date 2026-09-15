import { useMemo, useState } from 'react'
import type { WebsitePreviewData } from './WebsiteView'
import FamilyConnectorSentenceView from './FamilyConnectorSentenceView'
import { renderUnassessedPassage } from '../lib/busManifestTeam/reviewDeskDisplay'

const noWrite = () => {}

export default function ClassroomWhiteboard({ data, error, teacher, onStatementChange }: {
  data?: WebsitePreviewData | null
  error?: string | null
  teacher: boolean
  onStatementChange: () => void
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const sentences = useMemo(() => data?.sentences.filter(sentence => sentence.state != null)
    .slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? [], [data])
  const sentence = sentences.find(item => item.structureId === selectedId) ?? sentences[0]
  const presentation = useMemo(() => sentence?.state ? {
    paragraphs: [renderUnassessedPassage(sentence.textMi)],
    addresses: [{ structureId: sentence.structureId }],
    manifests: [{ savedAt: 'website-preview', stateFingerprint: `website-preview-${sentence.structureId}`,
      sourceOrderIndex: sentence.sortOrder, paragraphText: sentence.textMi,
      sourceAddress: { structureId: sentence.structureId }, state: sentence.state }],
  } : null, [sentence])
  return <section className="classroom-whiteboard" aria-label="Whiteboard statement">
    <div className="classroom-whiteboard-sentence" lang="mi">
      {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading…</p> : !presentation ? <p>No reviewed Māori statements available.</p> :
        <FamilyConnectorSentenceView key={sentence.structureId} displaySize="fit" loading={false}
          paragraphs={presentation.paragraphs} savedBusManifests={presentation.manifests}
          passageAddresses={presentation.addresses} posCatalog={data.catalog} onBusManifestWrite={noWrite}
          showPassageSearch={false} showPassageLabel={false} showPosTags={false} readOnly />}
    </div>
    {teacher && sentence ? <select className="classroom-whiteboard-picker" aria-label="Māori statement" value={sentence.structureId} onChange={event => {
      setSelectedId(Number(event.target.value)); onStatementChange()
    }}>{sentences.map(item => <option key={item.structureId} value={item.structureId}>{item.textMi}</option>)}</select> : null}
  </section>
}
