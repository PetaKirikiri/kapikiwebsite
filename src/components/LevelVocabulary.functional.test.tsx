// @vitest-environment happy-dom
import React,{act}from'react'
import{createRoot}from'react-dom/client'
import{expect,it,vi}from'vitest'
import{courseVocabularyEntries}from'../lib/courseVocabularyEntries'
import{courseCategories,possessionGuide}from'../lib/courseVocabularyCategories'
import{numberGuide}from'../lib/courseVocabularyNumber'
vi.mock('./useDesignSpaceCollection',()=>({useDesignSpaceCollection:()=>({collection:[]})}))
vi.mock('../hooks/useConnectorPatterns',()=>({useConnectorPatterns:()=>({rules:[]})}))
vi.mock('../lib/vocabularyPos',()=>({fetchVocabularyPos:vi.fn(async()=>[])}))
vi.mock('../lib/courseCurriculum',async()=>{const{courseVocabularyEntries}=await import('../lib/courseVocabularyEntries');const data={source:'database',lessons:[1,2,3,4,5,6].map(level=>({level,entries:courseVocabularyEntries(level as 1),optionalEntries:[]}))};return{useCourseCurriculum:()=>({data,error:''})}})
import LevelVocabulary from'./LevelVocabulary'
;(globalThis as{IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true
it('shows whole possessive determiners under Determiners and keeps possessed-number separate from possessor-number',async()=>{
 const host=document.createElement('div'),root=createRoot(host)
 try{
  await act(async()=>root.render(<LevelVocabulary level={4}/>))
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('.level-vocabulary-kind button')].find(b=>b.textContent?.startsWith('Words'))!.click())
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find(b=>b.textContent==='Determiners')!.click())
  for(const word of ['tā rāua','tō rāua','ā rāua','ō rāua'])expect([...host.querySelectorAll('tbody th [lang]')].map(x=>x.textContent)).toContain(word)
  const entry=courseVocabularyEntries(4).find(e=>e.text==='tō rāua')!
  expect(courseCategories(entry)).toEqual(['Determiners']);expect(numberGuide(entry)).toMatchObject({kind:'singular',note:'One possessed thing'});expect(possessionGuide(entry)).toMatchObject({category:'O'})
 }finally{await act(async()=>root.unmount())}
})
it('shows all actually taught foundational cardinal forms through Numbers',async()=>{
 const host=document.createElement('div'),root=createRoot(host)
 try{
  await act(async()=>root.render(<LevelVocabulary level={1}/>))
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('.level-vocabulary-kind button')].find(b=>b.textContent?.startsWith('Words'))!.click())
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find(b=>b.textContent==='Numbers')!.click())
  const words=[...host.querySelectorAll('tbody th [lang]')].map(x=>x.textContent)
  for(const word of ['kore','tahi','kotahi','rua','tokorua','toru','whā','rima','ono','whitu','waru','iwa','tekau'])expect(words).toContain(word)
 }finally{await act(async()=>root.unmount())}
})
