import { it, expect } from 'vitest'
import pacing from '../../docs/curriculum/translation-bank/course-pacing.json'
import bank from '../../docs/curriculum/translation-bank/sheets.json'

it('introduces the planned core language by lesson four and revisits every example later', () => {
  expect([...new Set(pacing.introductions.map(row => row.level))]).toEqual([1, 3, 4, 5, 6])
  for (const row of pacing.introductions) {
    expect(row.lesson).toBeLessThanOrEqual(4)
    for (const lesson of [row.lesson, row.lesson + 5]) {
      const sheet = bank.sheets.find(s => s.level === row.level && s.lesson === lesson)!
      for (const pair of row.pairs) for (const direction of ['en-mi', 'mi-en']) {
        expect(sheet.questions.some(q => q.mi.includes(pair.mi) && q.en.includes(pair.en) && q.direction === direction), `${sheet.id}: ${pair.mi}`).toBe(true)
      }
    }
  }
})
