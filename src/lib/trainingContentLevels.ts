import type { WebsitePreviewSentence } from '../components/WebsiteView'
import { contentProgression } from './trainingProgression'
import type { CurriculumLevel } from './sentenceStructureLevels'

export function contentForLevel(sentences: readonly WebsitePreviewSentence[], level: CurriculumLevel | null) {
  return contentProgression(sentences.filter(sentence => sentence.curriculumLevel === level))
}

export function vocabularyForLevel(rows: ReturnType<typeof contentForLevel>, family: string) {
  const skills = new Map<string, { key: string; examples: number; structures: Set<number> }>()
  for (const { sentence } of rows) {
    const key = sentence.training?.skillKey
    if (!key?.startsWith(`${family}:`)) continue
    const skill = skills.get(key) ?? { key, examples: 0, structures: new Set<number>() }
    skill.examples += 1
    skill.structures.add(sentence.structureId)
    skills.set(key, skill)
  }
  return [...skills.values()].map(skill => ({ ...skill, structures: skill.structures.size }))
}
