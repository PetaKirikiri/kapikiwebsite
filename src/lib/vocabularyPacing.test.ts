import {it,expect} from 'vitest'
import plan from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import {courseVocabularyTimeline} from './courseVocabularyTimeline'
import {courseVocabularyEntries} from './courseVocabularyEntries'
import {lessonWordTotals} from './vocabularyTimeline'
const rows=courseVocabularyTimeline(bank.sheets,([1,2,3,4,5,6] as const).flatMap(l=>courseVocabularyEntries(l).filter(e=>e.kind==='word')))
it('keeps the full weekly load within the budget without forcing a quota',()=>{
 expect(plan.lessons).toHaveLength(60)
 const totals=lessonWordTotals(rows)
 expect(plan.targetNewWordsPerLesson).toBe(15)
 for(const [index,count] of totals.added.entries())expect(count,plan.lessons[index].id).toBeLessThanOrEqual(plan.targetNewWordsPerLesson)
 expect(totals.total[59]).toBeLessThanOrEqual(plan.targetNewWordsPerCourse)
 expect(rows.filter(r=>r.type==='Noun'&&r.firstLesson===1).map(r=>r.word).sort()).toEqual(['tāne','wahine'])
 expect(plan.lessons.every(l=>l.coverageStatus.includes('Teacher validation'))).toBe(true)
})
it('keeps topic extensions available without counting them as core introductions',()=>{
 const optional=plan.lessons.flatMap(l=>l.optionalWords)
 expect(optional.length).toBeGreaterThan(0)
 expect(rows.find(r=>r.word==='pēkana')).toMatchObject({firstLesson:null,status:'optional'})
 expect(rows.find(r=>r.word==='whānau')).toMatchObject({firstLesson:5,status:'introduced'})
 expect(rows.find(r=>r.word==='kēmu')).toMatchObject({firstLesson:null,status:'optional'})
 expect(rows.find(r=>r.word==='pene')).toMatchObject({firstLesson:19,status:'introduced'})
 for(const lesson of plan.lessons){
  const core=new Set(lesson.newWords.map(w=>w.word))
  expect(lesson.optionalWords.every(w=>!core.has(w.word))).toBe(true)
 }
})
it('gives every expansion set a purpose and explicitly marks lexical-light introductions',()=>{
 const seen=new Set<string>()
 for(const lesson of plan.lessons){
  expect(lesson.goal.length).toBeGreaterThan(0)
  expect(lesson.rationale.length).toBeGreaterThan(20)
  if(lesson.level>1&&lesson.lesson===1){expect(lesson.consolidation).toBe(true);expect(lesson.newWords).toHaveLength(0)}
  for(const word of lesson.newWords){expect(seen.has(word.word),word.word).toBe(false);seen.add(word.word);expect(word.english.length).toBeGreaterThan(0)}
 }
})
