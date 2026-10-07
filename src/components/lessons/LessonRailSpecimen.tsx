import type { RailSpecimenWord } from '../../lib/connectorPresentation/engine'
import SavedConnectorCheckpoint from '../SavedConnectorCheckpoint'

/** Paint the engine's specimen unchanged; no word, shape, or colour rules live here. */
export default function LessonRailSpecimen({ plans, height = 22 }: { plans: readonly RailSpecimenWord[]; height?: number }) {
  return <span className="lesson-big-word-rail" aria-hidden="true" style={{ height }}>{plans.map((plan, index) => <span key={index} style={{ position: 'relative', flex: 1, backgroundColor: plan.materialColor ?? undefined }}>
    {plan.specimenLeftFace && <span style={{ position: 'absolute', right: '100%', top: 0 }}><SavedConnectorCheckpoint plan={plan.specimenLeftFace} displayHeight={height} /></span>}
    {plan.internalMaterial && <>
      <span style={{ position: 'absolute', inset: `0 0 0 ${plan.internalMaterial.fraction * 100}%`, backgroundColor: plan.internalMaterial.color }} />
      <span style={{ position: 'absolute', left: `${plan.internalMaterial.fraction * 100}%`, transform: 'translateX(-50%)', top: 0 }}><SavedConnectorCheckpoint plan={plan.internalMaterial.face} displayHeight={height} /></span>
    </>}
    {plan.specimenFace && <span style={{ position: 'absolute', left: '100%', top: 0 }}><SavedConnectorCheckpoint plan={plan.specimenFace} displayHeight={height} /></span>}
  </span>)}</span>
}
