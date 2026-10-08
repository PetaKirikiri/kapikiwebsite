import { expect, it } from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import catalogue from '../../docs/curriculum/translation-bank/vocabulary-types.json'
import { courseVocabularyEntries } from './courseVocabularyEntries'
import { courseVocabularyTimeline } from './courseVocabularyTimeline'
import { COURSE_VERB_TYPES, matchesCourseVocabularyType } from './courseVocabularyTypes'

const rows = courseVocabularyTimeline(bank.sheets, ([1, 2, 3, 4, 5, 6] as const)
  .flatMap(level => courseVocabularyEntries(level).filter(entry => entry.kind === 'word')))

it('partitions the full timeline, including optional words, without overlapping types', () => {
  const types = [...new Set(rows.map(row => row.type))]
  expect(types).not.toContain('Verb')
  expect(types).not.toContain('Noun / verb')
  for (const row of rows) {
    expect(types.filter(type => matchesCourseVocabularyType(row, type)), row.word).toEqual([row.type])
  }
  for (const type of COURSE_VERB_TYPES) {
    expect(rows.some(row => matchesCourseVocabularyType(row, type)), type).toBe(true)
  }
  const grouped = COURSE_VERB_TYPES.flatMap(type => rows.filter(row => matchesCourseVocabularyType(row, type)))
  const spellings = grouped.map(row => row.word.split(' · ')[0].normalize('NFC').toLowerCase())
  expect(new Set(grouped.map(row=>`${row.word}:${row.type}`)).size).toBe(grouped.length)
  expect(rows.find(row=>row.word==='noho · stay')).toMatchObject({type:'Intransitive verb',firstLesson:53})
})

it('keeps experience, state and passive readings out of the ordinary action groups', () => {
  const expected = {
    kai: 'Transitive verb', tuhi: 'Transitive verb', haere: 'Intransitive verb', moe: 'Intransitive verb',
    mōhio: 'Experience verb', hiahia: 'Experience verb', rongo: 'Experience verb', mārama: 'Experience verb',
    wareware: 'Experience verb', hora: 'Stative verb', mutu: 'Stative verb', pakaru: 'Stative verb',
    angitu: 'Stative verb', tuhia: 'Passive verb', whāia: 'Passive verb', kitea: 'Passive verb',
    tō: 'Determiner', mahi: 'Noun',
  }
  for (const [word, type] of Object.entries(expected)) {
    expect(rows.find(row => row.word === word)?.type, word).toBe(type)
  }
  expect(matchesCourseVocabularyType(rows.find(row => row.word === 'kai')!, 'Noun')).toBe(false)
  expect(rows.find(row => row.word === 'kai')?.english).toBe('eat')
  expect(rows.find(row => row.word === 'mārama')?.english).toBe('understand; be clear')
})

it('uses the course catalogue after merging existing, planned and optional vocabulary', () => {
  const types: Record<string, { type: string }> = catalogue.words
  for (const row of rows) {
    if (types[row.word]) expect(row.type, row.word).toBe(types[row.word].type)
  }
  expect(rows.find(row => row.word === 'tunu')).toMatchObject({ status: 'introduced', type: 'Transitive verb' })
  expect(rows.find(row => row.word === 'māmā · mum')?.type).toBe('Noun')
  expect(rows.find(row => row.word === 'māmā · light in weight')?.type).toBe('Describing word')
})
