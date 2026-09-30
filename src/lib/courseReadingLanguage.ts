import type { CurriculumLevel } from './sentenceStructureLevels'

// Editorial allocations for reading support. Not POS, engine rules or learned knowledge.
// Only the documented use is introduced; other meanings of a spelling are excluded.
export const READING_LANGUAGE = [
  { id: 'yesterday', level: 2, text: 'inanahi', english: 'yesterday', placement: 'end',
    usage: 'At the end of a past-tense sentence.', frames: [20, 28, 32, 55],
    example: ['I hoko ahau i te parāoa inanahi.', 'I bought the bread yesterday.'],
    sourceUrl: 'https://maoridictionary.co.nz/search?keywords=in%C4%81nahi' },
  { id: 'now', level: 2, text: 'ināianei', english: 'now', placement: 'end',
    usage: 'At the end of a sentence about now or an immediate action.', frames: [4, 22, 23, 24, 25, 29, 40, 42],
    example: ['Me hoko koe i te parāoa ināianei.', 'You should buy the bread now.'],
    sourceUrl: 'https://maoridictionary.co.nz/search?keywords=inaianei' },
  { id: 'tomorrow', level: 2, text: 'āpōpō', english: 'tomorrow', placement: 'end',
    usage: 'At the end of a sentence about a future action.', frames: [24, 30, 34, 35],
    example: ['Ka hoko ahau i te parāoa āpōpō.', 'I will buy the bread tomorrow.'],
    sourceUrl: 'https://maoridictionary.co.nz/search?keywords=%C4%81p%C5%8Dp%C5%8D' },
  { id: 'afterwards', level: 3, text: 'i muri mai', english: 'afterwards; later', placement: 'start',
    usage: 'Begin a later event in a past-tense account: I muri mai, i …', frames: [20, 32, 55],
    example: ['I muri mai, i whakatuwhera ia i te pēke.', 'Afterwards, she opened the bag.'],
    sourceUrl: 'https://maoridictionary.co.nz/word/1700' },
  { id: 'and-then', level: 4, text: 'ā', english: 'and then', placement: 'between',
    usage: 'Join two complete clauses describing successive actions: …, ā, …', frames: [20, 24, 32, 34, 55],
    example: ['Nā Maia te pukapuka i tuku, ā, nā Hana te pukapuka i tuku.', 'Maia handed over the book, and then Hana handed over the book.'],
    sourceUrl: 'https://maoridictionary.co.nz/word/39' },
  { id: 'but', level: 6, text: 'engari', english: 'but', placement: 'between',
    usage: 'Contrast two complete clauses: …, engari …', frames: [22, 24, 28, 29, 30, 34, 38, 40, 42],
    example: ['Ka whakarite ahau i te whare, engari kāore au e horoi i ngā pereti.', 'I will get the house ready, but I will not wash the plates.'],
    sourceUrl: 'https://kauwhatareo.govt.nz/en/resource/engari-ke-but/' },
] as const

export function courseReadingLanguage(level: CurriculumLevel) {
  return READING_LANGUAGE.filter(entry => entry.level === level)
}
