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
type LessonFocus={goal:string;newForms:string[]}
const grammarTypes=['Grammar word','Determiner','Pronoun','Verb modifier','Conjunction','Tense marker']
const lexicalTypes=['Noun','Name','Number','Position word','Time expression','Transitive verb','Intransitive verb','Stative verb','Passive verb','Experience verb','Describing word']
export function progressionWords<T extends Word>(words:T[],types:string[],lessons:LessonFocus[]=[]){
 const order=(w:Word)=>{
  const lesson=lessons[w.firstLesson!-1]
  const isGrammar=grammarTypes.includes(w.type)
  const focus=(lesson?.goal.toLocaleLowerCase('mi').match(/[\p{L}]+/gu)??[])
  const base=w.word.split(' · ')[0]
  const focusIndex=isGrammar?focus.indexOf(base):-1
  const formIndex=isGrammar?(lesson?.newForms??[]).indexOf(base):-1
  return [focusIndex>=0?0:isGrammar?1:2,focusIndex>=0?focusIndex:isGrammar?(formIndex>=0?formIndex:100+grammarTypes.indexOf(w.type)):lexicalTypes.indexOf(w.type),w.teachingOrder<0?Number.MAX_SAFE_INTEGER:w.teachingOrder]
 }
 return words.filter(w=>w.firstLesson!==null&&(!types.length||types.includes(w.type))).sort((a,b)=>{
  const week=a.firstLesson!-b.firstLesson!
  if(week)return week
  const aa=order(a),bb=order(b)
  return aa[0]-bb[0]||aa[1]-bb[1]||aa[2]-bb[2]||a.word.localeCompare(b.word,'mi')
 })
}
