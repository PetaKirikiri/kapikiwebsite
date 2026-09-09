import PatternDrawer from './PatternDrawer'
import type { ConnectorFacePlan } from '../lib/connectorPresentation/presentation'

/** Paint-only adapter: the engine owns selection, polarity, colours and endings. */
export default function SavedConnectorCheckpoint({ plan, displayHeight }: Readonly<{
  plan: ConnectorFacePlan
  displayHeight: number
}>) {
  if (plan.status === 'unavailable') return <span role="img" aria-label={plan.reason}
    title={plan.reason} data-connector-unavailable className="block border border-dashed border-amber-600"
    style={{ width: displayHeight, height: displayHeight }} />
  return <span className="block overflow-hidden" data-saved-connector-id={plan.snapshotId}
    data-connector-role={plan.role} data-material-side={plan.materialSide}
    style={{ width: displayHeight, height: displayHeight, backgroundColor: plan.background }}>
    <PatternDrawer drawing={plan.drawing} testId={`sentence-shape-${plan.snapshotId}`} ariaLabel={plan.label} />
  </span>
}
