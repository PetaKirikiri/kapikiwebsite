import { LEVEL_ONE_CONTENT } from './levelOneContent'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import { LEVEL_ONE_PHRASES } from './coursePhrases'
import { courseVocabulary } from './courseVocabulary'
import { courseKiwaha } from './courseKiwaha'
import { courseReadingLanguage } from './courseReadingLanguage'
import { pronounSupport, SHARED_POSSESSIVES } from './courseReferenceLanguage'
import references from '../../docs/curriculum/translation-bank/reference-progression.json'
import catalogue from '../../docs/curriculum/translation-bank/vocabulary-types.json'
import pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

export type VocabularyEntryKind = 'word' | 'phrase' | 'kiwaha'
export type CourseVocabularyEntry = {
  id: string
  kind: VocabularyEntryKind
  key?: string
  text: string
  english: string
  components: string[]
  topics?: string[]
  functionType?: string
  category?: string
  example?: readonly [string, string]
  sourceUrl?: string
  courseType?: string
  grammaticalForm?: boolean
  introducedLesson?: number
}

// Curriculum browsing only. Whole-expression functions do not become word POS.
export function courseVocabularyEntries(level: CurriculumLevel): CourseVocabularyEntry[] {
  const entries: CourseVocabularyEntry[] = courseVocabulary(level).map(word => ({
    id: `word:${word.senseKey}`, key: word.key, kind: 'word', text: word.word,
    english: word.english, components: [word.word], topics: word.topics, introducedLesson:word.introducedLesson, ...pronounSupport(word.key),
  }))
  for (const item of courseReadingLanguage(level)) {
    const word = entries.find(entry => entry.text === item.text)
    const support = { functionType: item.functionType, example: item.example, sourceUrl: item.sourceUrl }
    if (word) Object.assign(word, support)
    else if (bank.sheets.some(sheet => sheet.level <= level && sheet.questions.some(q => q.direction !== 'structure-choice' && new RegExp(`(^|[^\\p{L}])${item.text}(?=$|[^\\p{L}])`,'iu').test(q.mi)))) {
      const components = item.text.split(/\s+/)
      entries.push({ id: `language:${item.id}`, kind: components.length > 1 ? 'phrase' : 'word',
        key: components.length === 1 ? item.text : undefined,
        text: item.text, english: item.english, components, ...support })
    }
  }
  entries.push(...courseKiwaha(level).map(item => ({ ...item, kind: 'kiwaha' as const, id: `kiwaha:${item.id}` })))
  if (level === 4) entries.push(...SHARED_POSSESSIVES.map(item=>({
    ...item, kind:'word' as const, courseType:'Determiner', grammaticalForm:true,
    introducedLesson:Math.min(...references.groups.filter(group=>group.pairs.some(pair=>pair.mi.includes(`${item.text} `))).map(group=>(group.level-1)*10+group.lesson)),
  })))
  for(const item of pacing.senseIntroductions.filter(item=>item.type==='Time expression'&&item.word.includes(' ')&&Math.ceil(item.lesson/10)===level))entries.push({
    id:`time:${item.word}`,kind:'word',text:item.word,english:item.english,components:item.word.split(' '),
    courseType:'Time expression',grammaticalForm:true,introducedLesson:item.lesson,category:'Time expressions',
  })
  if (level === 1) entries.push(...LEVEL_ONE_PHRASES.map(item => ({
    ...item, id: `phrase:${item.text}`,
    kind: (item.functionType === 'Job title' ? 'word' : ['Greeting', 'Farewell'].includes(item.functionType) ? 'kiwaha' : 'phrase') as VocabularyEntryKind,
    key: item.functionType === 'Job title' ? item.text : undefined,
    components: item.text.split(/\s+/),
  })))
  const types:Record<string,{type:string}>=catalogue.words
  for(const entry of entries){
    const type=types[`${entry.text} · ${entry.english}`]?.type??types[entry.text]?.type
    if(type&&['Determiner','Number','Time expression','Verb modifier','Conjunction','Position word'].includes(type))entry.courseType=type
  }
  return entries.sort((a, b) => a.text.localeCompare(b.text, 'mi'))
}


// Personalisation is a choice, never a required or already-taught word list.
export function optionalPersonalisationEntries(level: CurriculumLevel): CourseVocabularyEntry[] {
 if(level!==1)return []
 return LEVEL_ONE_CONTENT.vocabulary.filter(group=>group.title.includes('optional')).flatMap(group=>group.words.map(word=>({
  id:`optional:${word.label}`,kind:'phrase' as const,text:word.label,english:word.meaning,
  components:word.label.split(/\s+/),functionType:'Job title',category:'Optional personalisation',
 })))
}
