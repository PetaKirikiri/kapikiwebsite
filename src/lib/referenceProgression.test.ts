import { it, expect } from 'vitest'
import plan from '../../docs/curriculum/translation-bank/reference-progression.json'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
it('teaches every planned reference sentence both ways by its scheduled lesson, no later than Level 4',()=>{
 for(const group of plan.groups){
  expect(group.level).toBeLessThanOrEqual(4)
  const sheet=bank.sheets.find(s=>s.level===group.level&&s.lesson===group.lesson)!
  for(const p of group.pairs) for(const direction of ['en-mi','mi-en']) {
   expect(sheet.questions.some(q=>q.mi.includes(p.mi)&&q.en.includes(p.en)&&q.direction===direction),`${group.title}: ${p.mi} ${direction}`).toBe(true)
  }
 }
})
it('covers the complete core personal, demonstrative and possessive paradigms',()=>{
 const forms=new Set(plan.groups.flatMap(g=>g.forms))
 for(const form of 'au ahau koe ia tāua māua kōrua rāua tātou mātou koutou rātou te ngā he tēnei ēnei tēnā ēnā tērā ērā tētahi ētahi tēhea ēhea taku aku tō ō tana ana tāku tōku tāu tōu tāna tōna āku ōku āu ōu āna ōna wai aha'.split(' '))expect(forms.has(form),form).toBe(true)
 for(const owner of 'tāua māua kōrua rāua tātou mātou koutou rātou'.split(' '))for(const prefix of ['tā','tō','ā','ō'])expect(forms.has(`${prefix} ${owner}`)).toBe(true)
})
it('revisits every added reference sentence before the end of Level 4',()=>{
 for(const group of plan.groups)for(const pair of group.pairs){
  expect(bank.sheets.some(s=>s.level<=4 && (s.level*100+s.lesson)>(group.level*100+group.lesson) && s.questions.some(q=>q.reviewClauses.some(c=>c.mi===pair.mi)&&q.mi.includes(pair.mi))),pair.mi).toBe(true)
 }
})
