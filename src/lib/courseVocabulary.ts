import bank from '../../docs/curriculum/translation-bank/sheets.json'
import pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import catalogue from '../../docs/curriculum/translation-bank/vocabulary-types.json'
import glosses from '../../docs/curriculum/vocabulary-glosses.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

// Student vocabulary follows exercised language, not the unexercised proposal pool.
// Course meanings and teaching dates never become dictionary/engine POS truth.
export function courseVocabulary(level: CurriculumLevel) {
  const meanings: Record<string, string> = glosses.meanings
  const contextual: Record<string, Record<string, string>> = glosses.levelMeanings
  const types: Record<string, { type: string; english?: string }> = catalogue.words
  const first = new Map<string, number>()
  const used = new Set<string>()
  for (const [index, sheet] of bank.sheets.entries()) for (const q of sheet.questions) {
    if (q.direction === 'structure-choice') continue
    for (const word of q.mi.toLowerCase().match(/[\p{L}]+/gu) ?? []) {
      if (!first.has(word)) first.set(word, index + 1)
      if (sheet.level === level) used.add(word)
    }
  }
  const core = new Map(pacing.lessons.flatMap(lesson => lesson.newWords.map(word => [word.word, word] as const)))
  const rows: { key: string; senseKey: string; word: string; english: string; topics: string[]; introducedLesson: number }[] = []
  for (const word of used) {
    if (types[word]?.type === 'Name') continue
    const entry = core.get(word)
    const english = entry?.english ?? contextual[level]?.[word] ?? types[word]?.english ?? meanings[word]
    // Names and unsupported tokens are not promoted to student vocabulary.
    if (!english) continue
    const topics = pacing.lessons.filter(lesson => lesson.level === level && lesson.newWords.some(item => item.word === word)).map(lesson => lesson.theme)
    const introducedLesson = first.get(word)!
    rows.push({ key: word, senseKey: word, word, english, introducedLesson, topics: topics.length ? topics : ['Revision'] })
    for (const sense of pacing.senseIntroductions.filter(item => item.word === word && item.lesson <= level * 10)) {
      rows.push({ key: word, senseKey: `${word}:${sense.english}`, word, english: sense.english,
        introducedLesson: sense.lesson, topics: [pacing.lessons[sense.lesson - 1].theme] })
    }
  }
  return rows.sort((a, b) => a.word.localeCompare(b.word, 'mi') || a.introducedLesson - b.introducedLesson)
}
