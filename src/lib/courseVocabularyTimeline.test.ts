import {expect,it} from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import themes from '../../docs/curriculum/translation-bank/vocabulary-themes.json'
import {courseVocabularyTimeline} from './courseVocabularyTimeline'
const rows=courseVocabularyTimeline(bank.sheets,[])
it('excludes names, pronouns, determiners and verbs from course nouns',()=>{
 for(const word of ['hana','mere','au','ia','ngā','haere','hīkoi','hoko'])expect(rows.find(r=>r.word===word)?.type).not.toBe('Noun')
 for(const word of ['tāne','wahine'])expect(rows.find(r=>r.word===word)?.firstLesson).toBe(1)
})
it('keeps coupled teaching sets together and separates different meanings',()=>{
 for(const pair of [['pāpā','māmā · mum'],['kuia','koroua'],['teina','tuakana'],['tuahine','tungāne'],['kurī','ngeru','manu'],['nui','iti','roa','poto']]){
  const lessons=pair.map(w=>rows.find(r=>r.word===w)?.firstLesson)
  expect(lessons.every(n=>typeof n==='number')).toBe(true)
  expect(new Set(lessons).size,pair.join(',')).toBe(1)
 }
 expect(rows.filter(r=>r.firstLesson===1&&r.type==='Noun').map(r=>r.word).sort()).toEqual(['tāne','wahine'])
 expect(rows.find(r=>r.word==='māmā · mum')?.type).toBe('Noun')
 expect(rows.find(r=>r.word==='māmā · light in weight')?.type).toBe('Describing word')
 expect(rows.find(r=>r.word==='roto')?.english).toBe('lake')
 expect(rows.find(r=>r.word==='roto · inside')?.type).toBe('Position word')
})
it('actually practises every new thematic sentence in both translation directions',()=>{
 for(const group of themes.groups)for(const pair of group.pairs)for(const direction of ['en-mi','mi-en']){
  expect(bank.sheets[group.lesson-1].questions.some(q=>q.mi.includes(pair.mi)&&q.en.includes(pair.en)&&q.direction===direction),`${group.lesson}: ${pair.mi} ${direction}`).toBe(true)
 }
})
it('keeps landscape, kinship groups and family generations in separate lessons',()=>{
 const groups=[
  {lesson:4,words:['maunga','awa','roto']},
  {lesson:5,words:['whānau','hapū','iwi']},
  {lesson:14,words:['tūpuna']},
  {lesson:6,words:['māmā · mum','pāpā','whaea','matua','kuia','koroua']},
 ]
 for(const group of groups)for(const word of group.words){
  expect(rows.find(row=>row.word===word)?.firstLesson,word).toBe(group.lesson)
 }
 for(const word of ['kura','marae','waka']){
  expect(rows.find(row=>row.word===word)?.firstLesson,word).toBeGreaterThan(10)
  expect(bank.sheets.slice(0,10).flatMap(s=>s.questions).filter(q=>q.direction!=='structure-choice')
   .some(q=>q.mi.toLowerCase().match(/[\p{L}]+/gu)?.includes(word)),word).toBe(false)
 }
 expect(rows.find(row=>row.word==='tari')).toMatchObject({status:'introduced'})
 expect(rows.find(row=>row.word==='whakapapa')).toMatchObject({status:'introduced'})
 expect(rows.find(row=>row.word==='mokopuna')?.firstLesson).toBe(9)
 expect(rows.find(row=>row.word==='whanaunga')?.firstLesson).toBe(9)
 for(const group of groups.slice(0,2)){
  const ordered=rows.filter(row=>row.firstLesson===group.lesson&&row.type==='Noun').sort((a,b)=>a.teachingOrder-b.teachingOrder)
  expect(ordered.map(row=>row.word)).toEqual(expect.arrayContaining(group.words))
 }
})
it('shows clean Māori labels without merging separate meanings or duplicating lake',()=>{
 const mama=rows.filter(row=>row.displayWord==='māmā')
 expect(mama.map(row=>row.english).sort()).toEqual(['light in weight','mum'])
 expect(new Set(mama.map(row=>row.word)).size).toBe(2)
 expect(rows.filter(row=>row.displayWord==='roto'&&row.type==='Noun')).toHaveLength(1)
 expect(rows.every(row=>!row.displayWord.includes(' · '))).toBe(true)
})

it('shows all taught possessive determiners as whole units without lexical credits',()=>{
 const owners=['tāua','māua','kōrua','rāua','tātou','mātou','koutou','rātou']
 const forms=owners.flatMap(owner=>['tā','tō','ā','ō'].map(prefix=>`${prefix} ${owner}`))
 for(const word of forms){const row=rows.find(r=>r.word===word)!;expect(row).toMatchObject({type:'Determiner',grammaticalForm:true});expect(row.firstLesson).toBeGreaterThan(10)
  expect(bank.sheets[row.firstLesson!-1].questions.some(q=>q.mi.includes(`${word} `))).toBe(true)
 }
 for(const word of ['tāku','tōku','tāu','tōu','tāna','tōna','āku','ōku','āu','ōu','āna','ōna'])expect(rows.find(r=>r.word===word)?.type).toBe('Determiner')
 expect(rows.filter(r=>r.grammaticalForm&&r.type==='Determiner')).toHaveLength(32)
})
it('teaches te before possessives and defers plural determiners beyond Level 1',()=>{
 expect(rows.find(r=>r.word==='te')?.firstLesson).toBe(2)
 expect(rows.find(r=>r.word==='tōku')?.firstLesson).toBe(3)
 const plural=/(?<![\p{L}])(?:ngā|āku|ōku|āu|ōu|āna|ōna|aku|ana|ēnei|ēnā|ērā|ētahi|ēhea)(?![\p{L}])/u
 for(const sheet of bank.sheets.slice(0,10))for(const q of sheet.questions)expect(plural.test(q.mi.toLowerCase()),q.mi).toBe(false)
 expect(rows.find(r=>r.word==='ngā')?.firstLesson).toBe(12)
 expect(rows.find(r=>r.word==='āku')?.firstLesson).toBe(25)
 for(const word of ['kotahi','rua','tokorua'])expect(rows.find(r=>r.word===word)).toMatchObject({type:'Number',firstLesson:8})
})
