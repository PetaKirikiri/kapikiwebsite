import { busManifestSheetSchema } from '../src/lib/busManifestContract.ts'

// The website uses its existing private read-only sentence service.
// Classroom targets and saved example answers never enter this request.
export async function analyseSentence(textMi) {
  if (typeof textMi !== 'string' || !textMi.trim() || textMi.length > 2000) throw new Error('Invalid sentence.')
  const upstream = process.env.CONNECTORS_API_URL
  const key = process.env.COURSE_SERVICE_KEY
  if (!upstream || !key) throw new Error('Sentence service is unavailable.')
  const url = new URL('/__website_sentence', upstream)
  if (url.protocol !== 'https:') throw new Error('Sentence service is unavailable.')
  const response = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-course-service-key': key },
    body: JSON.stringify({ textMi }), signal: AbortSignal.timeout(20000), redirect: 'error',
  })
  if (!response.ok) throw new Error('Sentence service is unavailable.')
  const body = await response.json()
  return { floor: { state: busManifestSheetSchema.parse(body.state) } }
}
