import { expect, it } from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import themes from '../../docs/curriculum/translation-bank/vocabulary-themes.json'
import pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import allocations from '../../docs/curriculum/translation-bank/teaching-allocations.json'

it('introduces useful contrasts together without inflating their later introduction', () => {
  for (const [week, words] of [[7, ['tama', 'kōtiro']], [24, ['kaha', 'ngoikore']], [29, ['tere', 'pōturi']]] as const) {
    for (const word of words) {
      expect(allocations.findIndex(a => a.translationVocabulary.includes(word)), word).toBe(week - 1)
    }
  }
  expect(pacing.lessons[44].newWords.map(w => w.word)).not.toContain('pōturi')
  expect(pacing.lessons[44].newWords.map(w => w.word)).not.toContain('ngoikore')
  expect(pacing.lessons[23].optionalWords.map(w => w.word)).toContain('pīrangi')
  expect(pacing.lessons[28].optionalWords.map(w => w.word)).toContain('huna')
})

it('retrieves every new first-pass theme sentence twice in both directions with earlier provenance', () => {
  const introductions = themes.groups.filter(g => 'reviewLessons' in g && !('alignmentPass' in g))
  expect(introductions).toHaveLength(6)
  for (const group of introductions) {
    const reviews = (group as typeof group & { reviewLessons: number[] }).reviewLessons
    expect(reviews).toHaveLength(2)
    for (const pair of group.pairs) for (const direction of ['en-mi', 'mi-en']) {
      expect(bank.sheets[group.lesson - 1].questions.some(q => q.mi === pair.mi && q.en === pair.en && q.direction === direction)).toBe(true)
      for (const week of reviews) {
        expect(week).toBeGreaterThan(group.lesson)
        const q = bank.sheets[week - 1].questions.find(q => q.mi === pair.mi && q.en === pair.en && q.direction === direction)
        expect(q, `${week}: ${pair.mi} ${direction}`).toBeDefined()
        expect(q!.kind).toBe('review')
        const source = bank.sheets.find(s => s.id === q!.reviewFrom)!
        expect(source).toBeDefined()
        expect(source.questions.some(old => old.mi === pair.mi && old.en === pair.en && old.direction === direction)).toBe(true)
      }
    }
  }
})

it('uses the available past and i/ki frames for the added breakfast and drink vocabulary', () => {
  const breakfast = themes.groups.find(g => g.lesson === 13 && g.theme === 'Breakfast in the past')!
  const drinks = themes.groups.find(g => g.lesson === 14 && g.theme === 'Drinks with i and ki')!
  expect(breakfast.words.map(w => w.word).sort()).toEqual(['hēki', 'miraka', 'parāoa', 'āporo'].sort())
  expect(breakfast.pairs.every(p => p.mi.startsWith('I '))).toBe(true)
  expect(drinks.pairs.some(p => p.mi.includes(' i te '))).toBe(true)
  expect(drinks.pairs.some(p => p.mi.includes(' ki te '))).toBe(true)
  expect(allocations[11].translationVocabulary).toContain('inu')
  expect(bank.sheets[12].lessonTargets).toEqual(['I'])
  expect(bank.sheets[13].lessonTargets).toEqual(['Kei te', 'I'])
})


it('fits the feasible coursewide examples and retrieval into fixed-size sheets', () => {
 const groups=themes.groups.filter(g=>'alignmentPass' in g && g.alignmentPass==='2026-10-08-coursewide')
 expect(groups).toHaveLength(36)
 expect(groups.reduce((n,g)=>n+g.pairs.length,0)).toBe(98)
 expect(groups.some(g=>g.lesson>=32 && g.lesson<=40)).toBe(false)
 expect(bank.sheets).toHaveLength(60)
 for(const sheet of bank.sheets)expect(sheet.questions).toHaveLength(50)
 for(const group of groups){
  const reviews=(group as typeof group & {reviewLessons:number[]}).reviewLessons??[]
  if(group.words.length && group.lesson<=50)expect(reviews.length).toBe(2)
  for(const pair of group.pairs)for(const direction of ['mi-en','en-mi']){
   expect(bank.sheets[group.lesson-1].questions.some(q=>q.mi===pair.mi && q.en===pair.en && q.direction===direction)).toBe(true)
   for(const week of reviews)expect(bank.sheets[week-1].questions.some(q=>q.mi===pair.mi && q.en===pair.en && q.direction===direction && q.kind==='review')).toBe(true)
  }
 }
})


it('smooths existing lexical groups without increasing vocabulary or losing retrieval',()=>{
 const loads=pacing.lessons.map(l=>l.newWords.length)
 expect(loads[5]).toBe(6);expect(loads[11]).toBe(6);expect(loads[25]).toBe(5)
 expect(Math.max(...loads)).toBeLessThanOrEqual(7)
 expect(loads.reduce((a,b)=>a+b,0)).toBe(163)
 for(const [week,words] of [[15,['kurī','ngeru','manu']],[16,['noho','tū']],[18,['pānui','tuhi','pukapuka']],[19,['hoatu','hōmai','whakarongo','pene']],[23,['waea','pēke']],[24,['runga','raro']]] as const){
  for(const word of words)expect(allocations.findIndex(a=>a.translationVocabulary.includes(word)),word).toBe(week-1)
 }
 for(const group of themes.groups.filter(g=>'alignmentPass' in g && g.alignmentPass==='2026-10-08-load-smoothing')){
  const reviews=(group as typeof group & {reviewLessons:number[]}).reviewLessons
  expect(reviews).toHaveLength(2)
  for(const pair of group.pairs)for(const week of reviews)for(const direction of ['en-mi','mi-en'])expect(bank.sheets[week-1].questions.some(q=>q.mi===pair.mi&&q.en===pair.en&&q.direction===direction&&q.kind==='review')).toBe(true)
 }
})
