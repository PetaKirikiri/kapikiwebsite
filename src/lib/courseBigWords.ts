import type { BusManifestSheet } from './busManifestContract'
import annotations from './courseBigWords.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

export type BigWordStructure = { readonly structureId: number; readonly sortOrder: number; readonly textMi: string; readonly curriculumLevel?: number | null; readonly state?: Pick<BusManifestSheet, 'tokens'> | null }

// Addressed teaching highlights only. Never consumed by POS, rails or inference.
export function courseBigWords(sentences: readonly BigWordStructure[], level: CurriculumLevel) {
  const groups = new Map<string, { label: string; purpose: string; level: number; sectionComplete?: boolean; slot?: string; followingHeading?: string; following?: { kind: string; example: string; source?: { structureId?: number; textMi: string; indices: number[] } }[]; examples: { structureId?: number; textMi: string; indices: number[] }[] }>()
  for (const sentence of [...sentences].sort((a, b) => (a.curriculumLevel ?? 99) - (b.curriculumLevel ?? 99) || a.sortOrder - b.sortOrder)) {
    if (!sentence.curriculumLevel || sentence.curriculumLevel > level) continue
    const annotation = annotations.find(item => item.structureId === sentence.structureId && item.textMi === sentence.textMi)
    if (!annotation) continue
    const key = `${annotation.label}:${annotation.purpose}`
    const group = groups.get(key) ?? { label: annotation.label, purpose: annotation.purpose, level: sentence.curriculumLevel, sectionComplete: annotation.sectionComplete, slot: annotation.slot, following: annotation.following, examples: [] }
    group.examples.push({ structureId: sentence.structureId, textMi: sentence.textMi, indices: annotation.indices })
    groups.set(key, group)
  }
  return [...groups.values()]
}

export function bigWordPosCodes(example: { structureId?: number; textMi: string; indices: number[] }, sentences: readonly BigWordStructure[]) {
  const sentence = sentences.find(item => item.structureId === example.structureId && item.textMi === example.textMi)
  return [...new Set(example.indices.flatMap(index => {
    const code = sentence?.state?.tokens.find(token => token.tokenIndex === index)?.acceptedPosCode
    return code ? [code] : []
  }))]
}
