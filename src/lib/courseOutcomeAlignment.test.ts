import { it, expect } from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import { LEVEL_ONE_READING } from './levelOneReadingMaterial'
import { LEVEL_READING_MATERIAL } from './levelReadingMaterial'
import plan from '../../docs/curriculum/translation-bank/outcome-alignment.json'
it('prepares every story sentence in both directions by its level',()=>{
 for(const [level,reading] of Object.entries({1:LEVEL_ONE_READING,...LEVEL_READING_MATERIAL})){
  const questions=bank.sheets.filter(s=>s.level<=Number(level)).flatMap(s=>s.questions)
  for(const section of reading.sections)for(const line of section.lines)for(const direction of ['en-mi','mi-en']){
   expect(questions.some(q=>q.mi.includes(line[0])&&q.en.includes(line[1])&&q.direction===direction),`L${level}: ${line[0]} ${direction}`).toBe(true)
  }
 }
})
it('keeps Level 1 translation practice focused on pepeha, including personal possessives',()=>{
 const text=bank.sheets.filter(s=>s.level===1).flatMap(s=>s.questions.map(q=>q.mi)).join(' ')
 for(const word of ['ēnei','kurī','ngeru','kaikaute','kaitātari'])expect(text.match(/[\p{L}]+/gu)).not.toContain(word)
 for(const word of ['tōku','tōu','tōna','tāku','tāu','tāna','ingoa','maunga','awa','whaea','kāinga'])expect(text).toContain(word)
 expect(bank.sheets[9].title).toBe('Give your pepeha')
})
it('includes each scheduled story exercise in the scheduled lesson',()=>{
 for(const p of plan.storyPractice){
  const s=bank.sheets.find(s=>s.level===p.level&&s.lesson===p.lesson)!
  for(const d of ['mi-en','en-mi'])expect(s.questions.some(q=>q.mi.includes(p.mi)&&q.direction===d),p.mi).toBe(true)
 }
})
