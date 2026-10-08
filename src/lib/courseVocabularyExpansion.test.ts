import { expect, it } from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import sequences from '../../docs/curriculum/translation-bank/lesson-sequences.json'
import {courseVocabularyTimeline} from './courseVocabularyTimeline'
const words=(s:string)=>s.normalize('NFC').toLowerCase().match(/[\p{L}]+/gu)??[]
it('actually teaches all selected additions and reordered vocabulary and retrieves each in two distinct later weeks, both ways',()=>{
 const targets=bank.expansion.targets
 expect(targets).toHaveLength(242)
 expect(targets.filter(t=>t.type==='Noun')).toHaveLength(157)
 for(const t of targets){
  expect(new Set(t.retrievalLessons).size,t.word).toBe(2)
  expect(t.retrievalLessons[0]).toBeGreaterThanOrEqual(t.introductionLesson+2)
  expect(t.retrievalLessons[1]).toBeGreaterThanOrEqual(t.introductionLesson+6)
  expect(new Set(t.pairs.map(p=>p.mi)).size,t.word).toBe(3)
  expect(bank.sheets.findIndex(s=>s.questions.some(q=>q.direction!=='structure-choice'&&words(q.mi).includes(t.word))),t.word).toBe(t.introductionLesson-1)
  for(const [i,week]of [t.introductionLesson,...t.retrievalLessons].entries())for(const direction of ['en-mi','mi-en']){
   const q=bank.sheets[week-1].questions.find(q=>q.mi===t.pairs[i].mi&&q.en===t.pairs[i].en&&q.direction===direction)
   expect(q,`${t.word}: ${week}, ${direction}`).toBeDefined()
   expect(words(q!.mi)).toContain(t.word)
   if(i){expect(q!.kind).toBe('transfer');expect(q!.retrievalFrom).toBe(bank.sheets[t.introductionLesson-1].id)}
  }
 }
 expect(courseVocabularyTimeline(bank.sheets,[]).filter(r=>r.type==='Noun'&&r.firstLesson!==null)).toHaveLength(239)
 expect(Math.max(...pacing.lessons.map(l=>l.newWords.length))).toBeLessThanOrEqual(10)
})
it('preserves grammar targets and original vocabulary dates, and introduces only the selected words plus explicit support',()=>{
 expect(bank.sheets.map(s=>s.pattern)).toEqual(bank.expansion.retainedGrammarTargets)
 expect(bank.sheets.map(s=>s.id)).toEqual(sequences.map(s=>s.id))
 const first=new Map<string,number>()
 bank.sheets.forEach((s,i)=>s.questions.filter(q=>q.direction!=='structure-choice').forEach(q=>words(q.mi).forEach(w=>{if(!first.has(w))first.set(w,i+1)})))
 for(const [word,week]of Object.entries(bank.expansion.retainedVocabularyIntroductions))expect(first.get(word),word).toBe(week)
 const allowed=new Set([...Object.keys(bank.expansion.retainedVocabularyIntroductions),...bank.expansion.targets.map(t=>t.word),...Object.keys(bank.functionalCoverage.supportIntroductions)])
 for(const word of first.keys())expect(allowed.has(word),word).toBe(true)
})
it('keeps clause retrieval grounded in an earlier retained exercise in the same direction',()=>{
 const previous=new Map<string,typeof bank.sheets[number]>()
 for(const s of bank.sheets){for(const q of s.questions)for(const clause of q.reviewClauses){
  const source=previous.get(clause.from)
  expect(source,`${s.id}: ${clause.mi}`).toBeDefined()
  expect(source!.questions.some(old=>old.direction===q.direction&&old.mi.includes(clause.mi)&&old.en.includes(clause.en))).toBe(true)
 }
 previous.set(s.id,s)
 }
})
