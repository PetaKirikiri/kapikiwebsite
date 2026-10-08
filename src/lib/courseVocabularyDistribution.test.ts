import {expect,it} from 'vitest'
import bank from '../../docs/curriculum/translation-bank/sheets.json'
import pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import {courseVocabularyEntries} from './courseVocabularyEntries'
import {courseVocabularyTimeline} from './courseVocabularyTimeline'
import type {CurriculumLevel} from './sentenceStructureLevels'
const rows=courseVocabularyTimeline(bank.sheets,([1,2,3,4,5,6] as CurriculumLevel[]).flatMap(l=>courseVocabularyEntries(l).filter(e=>e.kind==='word')))
it('shows all eight recognition starters without claiming lexical translation',()=>{
 const first=rows.filter(w=>w.firstLesson===1)
 expect(first.map(w=>w.word).sort()).toEqual(['e','he','kāorekau','kei','ko','kotahi','nō','toko-'].sort())
 expect(first.every(w=>w.recognitionOnly)).toBe(true)
 expect(first.some(w=>w.type==='Noun')).toBe(false)
 expect(bank.sheets[0].questions).toHaveLength(50)
 expect(bank.sheets[0].questions.every(q=>q.direction==='structure-choice'&&q.mi==='')).toBe(true)
 expect(pacing.lessons[0].newForms).toEqual(bank.sheets[0].newForms)
 for(const word of ['tāne','wahine'])expect(rows.find(w=>w.word===word)).toMatchObject({firstLesson:8})
 expect(rows.find(w=>w.word==='te')).toMatchObject({firstLesson:2})
 for(const word of ['rua','tokorua'])expect(rows.find(w=>w.word===word)?.firstLesson).toBe(8)
 expect(rows.find(w=>w.word==='toru')?.firstLesson).toBe(10)
 expect('classroom' in bank.sheets[0]).toBe(false)
})
