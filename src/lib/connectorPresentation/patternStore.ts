import { patternRulesSchema, type PatternKey, type PatternRule, type PatternValue } from './patterns'

type Snapshot = Readonly<{ rules: readonly PatternRule[]; loaded: boolean; installed: boolean; error: string | null }>
let snapshot: Snapshot = { rules: [], loaded: false, installed: false, error: null }
const listeners = new Set<() => void>()
let reading: Promise<void> | null = null
let revision = 0
function publish(next: Snapshot) { snapshot = next; listeners.forEach((listener) => listener()) }
export const getPatternSnapshot = () => snapshot
export function subscribePatternSnapshot(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
async function request(body: unknown) {
  const response = await fetch('/__connector_patterns', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  const result = await response.json() as { rules?: unknown; error?: string; installed?: boolean }
  if (!response.ok) throw new Error(result.error ?? 'Could not load connector patterns.')
  return { rules: patternRulesSchema.parse(result.rules), installed: result.installed === true }
}
export function refreshConnectorPatterns() {
  if (reading) return reading
  const started = revision
  reading = request({ operation: 'read' }).then((result) => {
    if (started === revision) publish({ ...result, loaded: true, error: null })
  }).catch((error: unknown) => {
    if (started === revision) publish({ ...snapshot, error: error instanceof Error ? error.message : 'Pattern settings unavailable.' })
  }).finally(() => { reading = null })
  return reading
}
export async function saveConnectorPattern(key: PatternKey, value: PatternValue, expectedRevision: number | null) {
  ++revision
  const result = await request({ operation: 'save', key, value, expectedRevision })
  if (!result.installed) throw new Error('The server did not acknowledge shared pattern storage.')
  publish({ ...result, loaded: true, error: null })
}
