import pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import themes from '../../docs/curriculum/translation-bank/vocabulary-themes.json'
import catalogue from '../../docs/curriculum/translation-bank/vocabulary-types.json'
import { vocabularyTimeline } from './vocabularyTimeline'
import references from '../../docs/curriculum/translation-bank/reference-progression.json'
import { SHARED_POSSESSIVES } from './courseReferenceLanguage'

// Editorial course senses only. No dictionary-wide POS inference or engine writes.
export function courseVocabularyTimeline(sheets:{newForms:string[]}[],entries:{text:string;english:string}[]){
 const types:Record<string,{type:string;english?:string}>=catalogue.words
 const teachingSets=themes.groups.flatMap(group=>group.words)
 const rows=vocabularyTimeline(sheets,entries).map(row=>({...row,status:'introduced',type:types[row.word]?.type??'Unclassified',english:types[row.word]?.english??row.english}))
 for(const group of themes.groups)for(const item of group.words){
  // These spellings have different taught senses and separate introductions.
  const multiple=item.word==='māmā'||(item.word==='roto'&&item.english==='inside')
  const label=multiple?`${item.word} · ${item.english}`:item.word
  if(multiple){const base=rows.findIndex(r=>r.word===item.word && item.word==='māmā');if(base>=0)rows.splice(base,1)}
  const row=rows.find(r=>r.word===label)
  if(row){row.firstLesson=Math.min(row.firstLesson??61,group.lesson);row.type=item.type;row.english=item.english}
  else rows.push({status:'introduced',word:label,english:item.english,type:item.type,firstLesson:group.lesson})
 }
 for(const lesson of pacing.lessons)for(const item of lesson.newWords){
  const firstLesson=(lesson.level-1)*10+lesson.lesson
  const label=item.word==='māmā'?`${item.word} · ${item.english}`:item.word
  const row=rows.find(r=>r.word===label)
  if(row && (row.firstLesson===null || row.firstLesson>firstLesson)){
   row.firstLesson=firstLesson;row.type=item.type;row.english=item.english;row.status='planned'
  }else if(!row)rows.push({word:label,english:item.english,type:item.type,firstLesson,status:'planned'})
 }
 for(const lesson of pacing.lessons)for(const item of lesson.optionalWords){
  // Keep extensions reviewable without turning them into scheduled new vocabulary.
  const row=rows.find(r=>r.word===item.word)
  if(!row)rows.push({word:item.word,english:item.english,type:item.type,firstLesson:null,status:'optional'})
  else if(row.firstLesson===null){row.status='optional';row.type=item.type;row.english=item.english}
 }
 // Selected later senses have their own teaching target without a new spelling
 // credit. This is course editorial data, never dictionary-wide POS or engine truth.
 for(const item of pacing.senseIntroductions){
  const label=`${item.word} · ${item.english}`
  const row=rows.find(r=>r.word===label)
  if(row){row.firstLesson=Math.min(row.firstLesson??61,item.lesson);row.type=item.type;row.english=item.english}
  else rows.push({word:label,english:item.english,type:item.type,firstLesson:item.lesson,status:item.status})
 }
 // Preserve unexercised catalogue candidates only as explicitly optional.
 for(const [word,entry] of Object.entries(types))if(!rows.some(row=>row.word===word)&&entry.type!=='Name'&&word!=='māmā')rows.push({word,english:entry.english??'',type:entry.type,firstLesson:null,status:'optional'})
 // Apply the one course type catalogue after every source has been merged, so
 // old broad labels in a theme or proposal cannot undo the exclusive groups.
 for(const row of rows){
  const entry=types[row.word]
  if(entry){row.type=entry.type;row.english=entry.english??row.english}
  if(row.type==='Name')row.english='Name'
 }
 const possessiveForms=new Set(SHARED_POSSESSIVES.map(item=>item.text))
 for(const item of SHARED_POSSESSIVES){
  const groups=references.groups.filter(group=>group.pairs.some(pair=>pair.mi.includes(`${item.text} `)))
  const firstLesson=Math.min(...groups.map(group=>(group.level-1)*10+group.lesson))
  if(Number.isFinite(firstLesson)){
   const existing=rows.find(row=>row.word===item.text)
   const form={word:item.text,english:item.english,type:'Determiner',firstLesson,status:'introduced'}
   if(existing)Object.assign(existing,form);else rows.push(form)
  }
 }
 return rows.map(row=>({
  ...row,
  grammaticalForm:possessiveForms.has(row.word)||row.word.split(' · ')[0].includes(' '),
  displayWord:row.word.split(' · ')[0],
  teachingOrder:teachingSets.findIndex(item=>item.word===row.word.split(' · ')[0]&&item.english===row.english),
 }))
}
