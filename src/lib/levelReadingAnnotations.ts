import authored from './levelReadingAnnotations.json'
import { busManifestSheetSchema } from './busManifestContract'

// Sentence-specific course artwork data, authored at the owner's request.
// These display annotations never enter automatic tagging or learned-word storage.
export const LEVEL_READING_ANNOTATIONS = Object.entries(authored).map(([textMi, entry]) => {
  const state = busManifestSheetSchema.parse(entry.state)
  if (state.tokens.map(token => token.surfaceText).join(' ') !== textMi) {
    throw new Error('Reading annotation does not match its sentence.')
  }
  return { textMi, state }
})
