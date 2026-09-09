import translations from './englishTranslations.json'
import { WORD_CLASS_VISUAL_PALETTE } from '../../components/railVisualPalette'

// Teaching translations, not POS evidence. Exact text keys prevent stale
// alignment from being reused after the canonical Māori sentence changes.
export function translatedSegments(text: string, materials: readonly (string | undefined)[], joins: readonly boolean[] = []) {
  const entry = (translations as Record<string, (string | number | null)[][]>)[text]
  if (!entry) return null
  const words = text.split(/\s+/u)
  // English may reorder or omit words inside a connected Māori phrase.
  // Membership follows every source boundary, not English token adjacency.
  let phrase = 0
  const phrases = words.map((_, index) => {
    if (index > 0 && joins[index - 1] !== true) phrase++
    return phrase
  })
  return entry.map(([english, source], part) => {
    const index = typeof source === 'number' ? source : null
    const previous = entry[part - 1]?.[1]
    const connectedBefore = index != null && typeof previous === 'number'
      && phrases[index] === phrases[previous]
    const text = String(english)
    const color = index == null ? undefined : materials[index]
    // Explicit English teaching cues, not a general morphological parser.
    const suffixLength = text === 'chased' ? 2 : text === 'eating' || text === 'chasing' ? 3 : 0
    const parts = suffixLength && color ? [
      { text: text.slice(0, -suffixLength), color },
      { text: text.slice(-suffixLength), color: WORD_CLASS_VISUAL_PALETTE.tam },
    ] : [{ text, color }]
    return { text, parts, sourceIndex: index,
      connectedBefore,
      sourceText: index == null ? null : words[index] ?? null,
      color }
  })
}
