import {isCourseVerbType} from '../src/lib/courseVocabularyTypes'
type Word={word:string;type:string;english:string;firstLesson:number|null;teachingOrder:number}
export const familyLabels={nominal:'Nouns & companions',verbal:'Actions & companions',verbalTarget:'Action / object',big:'Big words',doer:'Doer',target:'Done-to',quality:'Qualities',number:'Numbers',place:'Positions',time:'Time',link:'Links',other:'Other'}
export function wordFamily(w:Word):keyof typeof familyLabels{
 // Course display groups only; ambiguous spellings retain their supplied course sense.
 if(['Noun','Pronoun','Determiner','Name'].includes(w.type))return 'nominal'
 if(isCourseVerbType(w.type)||w.type==='Verb modifier'||w.type==='Tense marker')return 'verbal'
 if(w.type==='Grammar word'){
  if(/agent marker|doer marker/i.test(w.english))return 'doer'
  if(/object marker|target marker/i.test(w.english))return 'target'
  if(w.word==='i'&&/past action/i.test(w.english)&&/its object/i.test(w.english))return 'verbalTarget'
  if(/tense marker/i.test(w.english))return 'verbal'
  // Addressed action highlights in courseBigWords.json; supplied course meanings guard the role.
  const actionMeanings:Record<string,RegExp>={ka:/marks an action or change/,kua:/completed action/,ana:/action in progress/,ai:/habitual actions/,me:/before an action/,kia:/wish, instruction or purpose/,taea:/be able; be possible/}
  if(actionMeanings[w.word]?.test(w.english))return 'verbal'
  if(w.word==='e'&&/introduces a number/.test(w.english))return 'big'
  if(['ko','nō','kei','kāorekau'].includes(w.word))return 'big'
 }
 return ({'Describing word':'quality',Number:'number','Position word':'place','Time expression':'time',Conjunction:'link'} as const)[w.type as 'Number']??'other'
}
export function progressionWords<T extends Word>(words:T[],types:string[]){
 return words.filter(w=>w.firstLesson!==null&&(!types.length||types.includes(w.type))).sort((a,b)=>a.firstLesson!-b.firstLesson!||(a.teachingOrder<0?Infinity:a.teachingOrder)-(b.teachingOrder<0?Infinity:b.teachingOrder)||a.word.localeCompare(b.word,'mi'))
}
