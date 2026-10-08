import { it, expect } from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
const sheets=bank.sheets.filter(s=>s.level===2)
it('starts with all six TAM choices and only previously taught translations',()=>{
 const first=sheets[0]
 expect(first.questions.filter(q=>q.direction==='structure-choice')).toHaveLength(30)
 for(const q of first.questions.filter(q=>q.direction==='structure-choice'))expect(q.options).toEqual(['I','Kua','Kei te','E … ana','Ka','Me'])
 expect(first.questions.filter(q=>q.direction!=='structure-choice').every(q=>['review','transfer'].includes(q.kind)&&(q.reviewFrom??q.retrievalFrom)?.startsWith('L1-'))).toBe(true)
})
it('introduces i in lesson 3 and ki by lesson 4',()=>{
 for(const s of sheets.slice(0,2))for(const q of s.questions){
  expect(q.mi).not.toMatch(/\s(?:i|ki)\s/)
  expect(q.context).toBe('')
 }
 expect(sheets[2].questions.some(q=>q.mi==='I kite ahau i a ia.')).toBe(true)
 expect(sheets[3].questions.some(q=>q.mi==='I titiro ahau ki a ia.')).toBe(true)
 expect(sheets[3].questions.some(q=>q.context==='Kei te haere koe ___ te kura.')).toBe(true)
})
it('accepts both taught ongoing TAMs where the English cannot distinguish them',()=>{
 for(const s of sheets)for(const q of s.questions.filter(q=>q.choiceLabel==='Choose the TAM' && q.answer==='Kei te'))expect(q.acceptedAnswers).toEqual(['Kei te','E … ana'])
})
