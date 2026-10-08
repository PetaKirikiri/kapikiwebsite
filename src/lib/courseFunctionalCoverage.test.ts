import {expect,it}from'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import{courseVocabularyEntries}from'./courseVocabularyEntries'
import{courseVocabularyTimeline}from'./courseVocabularyTimeline'
import{lessonWordTotals}from'./vocabularyTimeline'
it('actually practises every selected functional target and both later retrievals in both directions',()=>{
 for(const target of bank.functionalCoverage.targets){
  for(const [i,week]of [target.introductionLesson,...target.retrievalLessons].entries())for(const direction of ['en-mi','mi-en']){
   const pair=target.pairs[i]
   expect(bank.sheets[week-1].questions.some(q=>q.direction===direction&&q.mi.includes(pair.mi)&&q.en.includes(pair.en)),`${target.word}: ${week} ${direction}`).toBe(true)
  }
  expect(target.retrievalLessons[0]).toBeGreaterThan(target.introductionLesson)
 }
})
it('shows functional expressions, cardinal forms and determiner units without counting compounds as lexical gains',()=>{
 const entries=([1,2,3,4,5,6]as const).flatMap(courseVocabularyEntries)
 const rows=courseVocabularyTimeline(bank.sheets,entries)
 expect(new Set(rows.map(r=>r.word)).size).toBe(rows.length)
 for(const word of ['kore','tahi','rua','toru','whā','rima','ono','whitu','waru','iwa','tekau','kotahi','tokorua'])expect(rows.find(r=>r.word===word)).toMatchObject({type:'Number'})
 for(const word of ['mua','muri','waenganui'])expect(rows.find(r=>r.word===word)).toMatchObject({type:'Position word',firstLesson:30})
 for(const word of ['inapō','ākuanei'])expect(rows.find(r=>r.word===word)).toMatchObject({type:'Time expression',firstLesson:30})
 for(const word of ['i te ata nei','ā te pō','āpōpō i te ata','ā muri ake nei']){
  expect(entries.find(e=>e.text===word)).toMatchObject({courseType:'Time expression',grammaticalForm:true})
  expect(rows.find(r=>r.displayWord===word&&r.firstLesson!==null)).toMatchObject({grammaticalForm:true,type:'Time expression'})
 }
 expect(lessonWordTotals(rows).total).toEqual(lessonWordTotals(rows.filter(r=>!r.grammaticalForm)).total)
 for(const word of ['tā rāua','tō rāua','ā rāua','ō rāua'])expect(entries.find(e=>e.text===word)).toMatchObject({courseType:'Determiner',kind:'word',introducedLesson:37})
})
