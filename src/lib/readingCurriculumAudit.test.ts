import { expect, it } from 'vitest'
import draft from '../../docs/curriculum/vocabulary-progression.draft.json'
import { LEVEL_ONE_READING } from './levelOneReadingMaterial'
import { LEVEL_READING_MATERIAL, type ReadingMaterialContent } from './levelReadingMaterial'
import { READING_LANGUAGE } from './courseReadingLanguage'
import { COURSE_KIWAHA, readingKiwaha } from './courseKiwaha'

const readings: Record<number, ReadingMaterialContent> = { 1: LEVEL_ONE_READING, ...LEVEL_READING_MATERIAL }
const names = new Set(['Ngongotahā', 'Rotorua', 'Mere', 'Hemi', 'Hana', 'Rangi', 'Aroha', 'Pōneke', 'Maia'])

it('keeps every ordinary reading word within the cumulative vocabulary allocation', () => {
  for (const [level, reading] of Object.entries(readings)) {
    const available = new Set(draft.groups.filter(group => group.level <= Number(level)).flatMap(group => group.wordKeys))
    for (const [text, , , curriculum] of reading.sections.flatMap(section => section.lines)) {
      if (curriculum?.kiwahaId) continue
      const ordinary = (curriculum?.language ?? []).reduce((value, id) => {
        const entry = READING_LANGUAGE.find(item => item.id === id)
        return entry ? value.replace(expressionPattern(entry.text), '') : value
      }, text)
      const outside = (ordinary.match(/[\p{L}]+/gu) ?? []).filter(word => !names.has(word) && !available.has(word.toLocaleLowerCase('mi')))
      expect(outside, `Level ${level}: ${text}`).toEqual([])
    }
  }
})

it('identifies an existing, current-or-earlier course frame for every ordinary line', () => {
  for (const [level, reading] of Object.entries(readings)) {
    const references: number[] = []
    for (const [text, , , curriculum] of reading.sections.flatMap(section => section.lines)) {
      expect(curriculum, text).toBeDefined()
      if (curriculum!.kiwahaId) continue
      expect(curriculum!.structures.length, text).toBeGreaterThan(0)
      for (const id of curriculum!.structures) {
        const source = draft.courseStructures.find(structure => Number(structure.id) === id)
        expect(source, `Missing source ${id}: ${text}`).toBeDefined()
        expect(source!.level, text).toBeLessThanOrEqual(Number(level))
        references.push(source!.level)
      }
    }
    // Stories must recycle earlier teaching as well as illustrate this level.
    expect(references).toContain(Number(level))
    if (Number(level) > 1) expect(references.some(source => source < Number(level))).toBe(true)
  }
})

it('allows only whole, explicitly allocated kīwaha and never borrows them from a later level', () => {
  expect(new Set(COURSE_KIWAHA.map(entry => entry.id)).size).toBe(COURSE_KIWAHA.length)
  expect(COURSE_KIWAHA.map(entry => [entry.text, entry.level])).toEqual([['Tau kē!', 1], ['Hei aha!', 3]])
  for (const [level, reading] of Object.entries(readings)) {
    for (const [text, english, , curriculum] of reading.sections.flatMap(section => section.lines)) {
      if (!curriculum?.kiwahaId) continue
      const entry = readingKiwaha(curriculum.kiwahaId)
      expect(entry, text).toBeDefined()
      expect(entry!.text).toBe(text)
      expect(entry!.english).toBe(english)
      expect(entry!.level).toBeLessThanOrEqual(Number(level))
      expect(curriculum.structures).toEqual([])
      expect(entry!.sourceUrl).toMatch(/^https:\/\/maoridictionary\.co\.nz\/word\//)
    }
  }
})

it('keeps known curriculum exclusions out of early readings', () => {
  const text = (level: number) => readings[level].sections.flatMap(section => section.lines).map(([mi]) => mi).join(' ')
  expect(text(1)).not.toMatch(/\b(?:tōku|ōku|tāku)\b/u)
  for (const level of [1, 2, 3]) expect(text(level)).not.toMatch(/\b(?:tēnei|tēnā|tērā|ēnei|ēnā|ērā)\b/u)
  expect(text(2)).not.toMatch(/\b(?:tunu|horoi|pereti|tēpu)\b/u)
  expect(text(3)).not.toMatch(/\b(?:Horoia|Tangohia|horoia|tangohia)\b/u)
})

function expressionPattern(text: string) {
  return new RegExp(`(?<![\\p{L}])${text}(?![\\p{L}])`, 'iu')
}

// Narrow editorial checks: allocated expressions, their documented placement and
// referenced course frames. These do not prove the sentence's grammatical analysis.
function languageIssues(level: number, text: string, structures: readonly number[], ids: readonly string[]) {
  const issues: string[] = []
  for (const entry of READING_LANGUAGE) {
    if (expressionPattern(entry.text).test(text) && !ids.includes(entry.id)) issues.push(`untracked: ${entry.id}`)
  }
  for (const id of ids) {
    const entry = READING_LANGUAGE.find(item => item.id === id)
    if (!entry) { issues.push(`unknown: ${id}`); continue }
    if (entry.level > level) issues.push(`later level: ${id}`)
    if (!expressionPattern(entry.text).test(text)) issues.push(`absent: ${id}`)
    if (!structures.length || structures.some(frame => !(entry.frames as readonly number[]).includes(frame))) issues.push(`frame: ${id}`)
    if (entry.placement === 'end' && !new RegExp(`${entry.text}[.!?]$`, 'iu').test(text)) issues.push(`placement: ${id}`)
    if (entry.placement === 'start' && !text.toLocaleLowerCase('mi').startsWith(`${entry.text}, `)) issues.push(`placement: ${id}`)
    if (entry.placement === 'between') {
      const join = id === 'and-then' ? ', ā, ' : ', engari '
      const parts = text.split(join)
      if (parts.length !== 2 || parts.some(part => part.trim().split(/\s+/u).length < 3) || structures.length < 2) issues.push(`placement: ${id}`)
    }
  }
  return issues
}

it('uses only explicitly introduced time and linking expressions in their documented constructions', () => {
  for (const [level, reading] of Object.entries(readings)) {
    for (const [text, , , curriculum] of reading.sections.flatMap(section => section.lines)) {
      if (curriculum?.kiwahaId) continue
      expect(languageIssues(Number(level), text, curriculum!.structures, curriculum!.language ?? []), text).toEqual([])
    }
  }
})

it('rejects premature, untracked, mismatched and unsupported uses instead of whitelisting spellings', () => {
  expect(languageIssues(2, 'Ka kai ahau, ā, ka inu ahau.', [24, 24], ['and-then'])).toContain('later level: and-then')
  expect(languageIssues(2, 'I kai ahau āpōpō.', [20], ['tomorrow'])).toContain('frame: tomorrow')
  expect(languageIssues(2, 'Ka kai ahau āpōpō.', [24], [])).toContain('untracked: tomorrow')
  expect(languageIssues(4, 'Ka tatari ahau ā pau noa te rā.', [24], ['and-then'])).toContain('placement: and-then')
  expect(languageIssues(6, 'Ka kai ahau.', [24], ['luckily'])).toContain('unknown: luckily')
  expect(languageIssues(3, 'I whakatuwhera ia i te pēke.', [20], ['afterwards'])).toContain('absent: afterwards')
})
