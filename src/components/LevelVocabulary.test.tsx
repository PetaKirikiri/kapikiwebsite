// @vitest-environment happy-dom
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import {courseVocabulary} from '../lib/courseVocabulary'
import {courseVocabularyEntries,optionalPersonalisationEntries} from '../lib/courseVocabularyEntries'
import {fetchVocabularyPos} from '../lib/vocabularyPos'
vi.mock('./useDesignSpaceCollection',()=>({useDesignSpaceCollection:()=>({collection:[]})}))
vi.mock('../hooks/useConnectorPatterns',()=>({useConnectorPatterns:()=>({rules:[]})}))
vi.mock('../lib/vocabularyPos',()=>({fetchVocabularyPos:vi.fn(async(words:string[])=>words.map(word=>({word,teAka:[],broadPos:[],specificPos:[],categories:[]})))}))
import LevelVocabulary from './LevelVocabulary'
;(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true
async function choose(host:HTMLElement,label:string){
 const button=[...host.querySelectorAll<HTMLButtonElement>('.level-vocabulary-kind button')].find(button=>button.textContent?.startsWith(label))!
 expect(button).toBeDefined();await act(async()=>button.click())
}
it('limits student vocabulary to exercised words and retains separate taught senses',()=>{
 for(const level of [1,2,3,4,5,6] as const){
  const exercised=new Set(bank.sheets.filter(s=>s.level===level).flatMap(s=>s.questions.filter(q=>q.direction!=='structure-choice').flatMap(q=>q.mi.toLowerCase().match(/[\p{L}]+/gu)??[])))
  const words=courseVocabulary(level);expect(words.length).toBeGreaterThan(0)
  for(const word of words){expect(exercised.has(word.key),word.key).toBe(true);expect(word.english.trim()).not.toBe('');expect(word.introducedLesson).toBeLessThanOrEqual(level*10)}
  expect(new Set(words.map(word=>word.senseKey)).size).toBe(words.length)
  expect(words.some(word=>['kaitātari','kaitohutohu','whāia'].includes(word.key))).toBe(false)
 }
 expect(courseVocabulary(1).find(w=>w.key==='roto')?.english).toBe('lake')
 expect(courseVocabulary(3).find(w=>w.senseKey==='roto:inside')?.english).toBe('inside')
 expect(courseVocabulary(5).filter(w=>w.key==='māmā').map(w=>w.english)).toEqual(['mum','light in weight'])
})
it('renders the actual word list and requests each dictionary spelling once',async()=>{
 const host=document.createElement('div');const root=createRoot(host)
 try{for(const level of [1,2,3,4,5,6] as const){
  vi.mocked(fetchVocabularyPos).mockClear();await act(async()=>root.render(<LevelVocabulary key={level} level={level}/>));await choose(host,'Words')
  expect(host.querySelectorAll('tbody tr')).toHaveLength(courseVocabularyEntries(level).filter(e=>e.kind==='word').length)
  expect(fetchVocabularyPos).toHaveBeenCalledTimes(1)
  const requested=vi.mocked(fetchVocabularyPos).mock.calls[0][0];expect(new Set(requested).size).toBe(requested.length)
  expect(host.querySelector('table')?.getAttribute('aria-label')).toBe(`Level ${level} vocabulary`)
  expect(host.textContent).not.toContain('kaitātari')
 }}finally{await act(async()=>root.unmount())}
})
it('keeps optional personalisation visibly separate from taught words and greetings',async()=>{
 const host=document.createElement('div');const root=createRoot(host)
 try{
  await act(async()=>root.render(<LevelVocabulary level={1}/>));await choose(host,'Words');expect(host.querySelector('tbody')?.textContent).not.toContain('kaitātari')
  await choose(host,'Phrases');expect(host.textContent).toContain('Kia ora');expect(host.textContent).not.toContain('kaitātari')
  await choose(host,'Optional roles');expect(host.querySelectorAll('tbody tr')).toHaveLength(optionalPersonalisationEntries(1).length)
  expect(host.querySelector('tbody')?.textContent).toContain('kaitātari');expect(host.querySelector('tbody')?.textContent).toContain('Optional personalisation')
  await choose(host,'Words');expect(host.querySelector('tbody')?.textContent).not.toContain('kaitātari')
 }finally{await act(async()=>root.unmount())}
})
it('preserves recorded dictionary and confirmed/unreviewed internal metadata',async()=>{
 vi.mocked(fetchVocabularyPos).mockImplementationOnce(async words=>words.map(word=>({word,
  teAka:word==='ahau'?[{code:'pronoun',label:'Pronoun',url:'https://maoridictionary.co.nz/word/103'}]:[],
  broadPos:word==='ahau'?[{code:'noun',label:'Noun',status:'unreviewed' as const}]:[],
  specificPos:word==='ahau'?[{code:'pronoun',label:'Pronoun',status:'confirmed' as const}]:[],categories:[],
 })))
 const host=document.createElement('div');const root=createRoot(host)
 try{
  await act(async()=>root.render(<LevelVocabulary level={1}/>));await choose(host,'Words')
  const row=[...host.querySelectorAll('tbody tr')].find(row=>row.querySelector('th [lang]')?.textContent==='ahau')!
  expect(row.textContent).toContain('NounUnreviewed');expect(row.textContent).toContain('PronounConfirmed')
  expect(row.querySelector('a[aria-label="Pronoun — Te Aka entry for ahau"]')?.getAttribute('href')).toBe('https://maoridictionary.co.nz/word/103')
  const pronouns=[...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(b=>b.textContent==='Pronouns')!;await act(async()=>pronouns.click())
  expect(host.querySelectorAll('tbody tr')).toHaveLength(1);expect(host.querySelector('tbody')?.textContent).toContain('ahau')
 }finally{await act(async()=>root.unmount())}
})
it('retains meanings when metadata fails and retries the lookup',async()=>{
 vi.mocked(fetchVocabularyPos).mockRejectedValueOnce(new Error('offline'))
 const host=document.createElement('div');const root=createRoot(host)
 try{
  await act(async()=>root.render(<LevelVocabulary level={1}/>));await choose(host,'Words')
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded');expect(host.querySelector('tbody')?.textContent).toContain('I; me')
  expect(host.querySelector('[aria-label="Unavailable"]')).not.toBeNull();expect(host.querySelector('[aria-label="No recorded POS"]')).toBeNull()
  await act(async()=>host.querySelector<HTMLButtonElement>('[role="alert"] button')!.click());expect(host.querySelector('[role="alert"]')).toBeNull()
 }finally{await act(async()=>root.unmount())}
})
