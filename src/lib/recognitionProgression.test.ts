import { it, expect } from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import allocations from '../../docs/curriculum/translation-bank/teaching-allocations.json'
import plans from '../../docs/curriculum/translation-bank/level-recognition.json'
import sequences from '../../docs/curriculum/translation-bank/lesson-sequences.json'
import pacing from '../../docs/curriculum/translation-bank/course-pacing.json'

it('opens every later level with recognition only for new material', () => {
  for (const level of [2, 3, 4, 5, 6]) {
    const sheet=bank.sheets.find(s=>s.level===level && s.lesson===1)!
    const allocation=allocations.find(a=>a.id===sheet.id)!
    expect(allocation.translationVocabulary).toEqual([])
    expect(allocation.translationFrames).toEqual([])
    expect(sheet.questions.filter(q=>q.direction==='structure-choice')).toHaveLength(30)
    for (const q of sheet.questions.filter(q=>q.direction!=='structure-choice')) {
      expect(q.kind).toBe('review')
      const source=bank.sheets.find(s=>s.id===q.reviewFrom)!
      expect(source.level).toBeLessThan(level)
    }
  }
})
it('uses the current level patterns and covers every introduced recognition answer', () => {
  for (const plan of plans) {
    const first=bank.sheets.find(s=>s.level===plan.level && s.lesson===1)!
    expect(new Set(first.questions.filter(q=>q.direction==='structure-choice').map(q=>q.answer))).toEqual(new Set(plan.options))
    for (const sheet of bank.sheets.filter(s=>s.level===plan.level && s.lesson===1)) {
      for (const q of sheet.questions.filter(q=>q.direction==='structure-choice')) {
        expect(q.options).toEqual(plan.options)
        expect(q.mi).toBe('')
      }
    }
  }
})
it('limits new translation work in lessons 2–4 to the explicitly staged simple examples', () => {
  for (const sheet of bank.sheets.filter(s=>s.level>=3 && s.lesson>=2 && s.lesson<=4)) {
    const allowed=[...sequences.find(p=>p.id===sheet.id)!.anchors.map(p=>p.mi), ...pacing.introductions.filter(p=>p.level===sheet.level && p.lesson===sheet.lesson).flatMap(p=>[...p.pairs,...('extensionPairs' in p ? p.extensionPairs??[] : [])].map(q=>q.mi))]
    for (const q of sheet.questions.filter(q=>q.direction!=='structure-choice' && q.kind==='focus'))expect(allowed).toContain(q.mi)
  }
})

it('scaffolds all 54 subsequent lessons around their own targets before extension', () => {
  expect(sequences).toHaveLength(60)
  for (const plan of sequences.filter(p=>p.mode==='scaffolded')) {
    const sheet=bank.sheets.find(s=>s.id===plan.id)!
    const questions=sheet.questions as Array<(typeof sheet.questions)[number] & {stage:string}>
    expect(questions.slice(0,10).every(q=>q.direction==='structure-choice')).toBe(true)
    for(const target of plan.targets)expect(questions.slice(0,10).map(q=>q.answer),sheet.id).toContain(target)
    const stages=['Recognise','Simple sentences','Revisit','Build on it']
    expect(questions.map(q=>stages.indexOf(q.stage))).toEqual(questions.map(q=>stages.indexOf(q.stage)).sort((a,b)=>a-b))
    for(const direction of ['en-mi','mi-en'])expect(questions.some(q=>q.stage==='Simple sentences' && q.direction===direction),sheet.id).toBe(true)
    for(const q of questions.filter(q=>q.stage==='Simple sentences'))expect(plan.anchors.some(a=>a.mi===q.mi && a.en===q.en),sheet.id).toBe(true)
  }
})

it('contrasts familiar patterns without padding follow-on lessons with identical prompts', () => {
  for (const sheet of bank.sheets.filter(s=>s.lesson>1)) {
    const choices=sheet.questions.filter(q=>q.direction==='structure-choice')
    expect(new Set(choices.map(q=>q.answer)).size,sheet.id).toBeGreaterThan(1)
    const counts=new Map<string,number>()
    choices.forEach(q=>counts.set(q.en,(counts.get(q.en)||0)+1))
    expect(Math.max(...counts.values()),sheet.id).toBeLessThanOrEqual(3)
    expect(new Set(sheet.questions.filter(q=>q.kind==='focus' && q.direction!=='structure-choice').map(q=>q.mi)).size,sheet.id).toBeGreaterThanOrEqual(4)
  }
})
it('only credits new vocabulary when a learner actually encounters it', () => {
  for(const sheet of bank.sheets) {
    const actual=new Set(sheet.questions.filter(q=>q.direction!=='structure-choice').flatMap(q=>q.mi.toLowerCase().match(/[\p{L}]+/gu)||[]))
    for(const word of sheet.newForms)expect(actual.has(word),`${sheet.id}: ${word}`).toBe(true)
  }
})
