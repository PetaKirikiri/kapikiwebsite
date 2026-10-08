import React, {useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useCourseCurriculum} from '../src/lib/courseCurriculum'
import {COURSE_VERB_TYPES,isCourseVerbType,matchesCourseVocabularyType} from '../src/lib/courseVocabularyTypes'
import {lessonWordTotals} from '../src/lib/vocabularyTimeline'
import './vocabulary-timeline.css'
const levels=[1,2,3,4,5,6] as const
const columns=Array.from({length:60},(_,i)=>i+1)
function App(){
 const {data,error}=useCourseCurriculum()
 const words=data?.lessons.flatMap(lesson=>lesson.timeline)??[]
 const wordTotals=lessonWordTotals(words)
 const pacing={lessons:data?.lessons.map(lesson=>lesson.pacing)??[]}
 const gridRef=useRef<HTMLDivElement>(null)
 function jumpToLevel(level:number){const grid=gridRef.current;const heading=grid?.querySelector<HTMLElement>(`[data-level="${level}"]`);const word=grid?.querySelector<HTMLElement>('.word-heading');if(grid&&heading)grid.scrollTo({left:heading.offsetLeft-(word?.offsetWidth??210),behavior:'smooth'})}

 const [type,setType]=useState('Noun')
 const types=[...new Set(words.map(w=>w.type))].filter(type=>!isCourseVerbType(type)).sort()
 const visible=words.filter(w=>w.firstLesson!==null&&matchesCourseVocabularyType(w,type)).sort((a,b)=>(a.firstLesson??61)-(b.firstLesson??61)||(a.teachingOrder<0?Number.MAX_SAFE_INTEGER:a.teachingOrder)-(b.teachingOrder<0?Number.MAX_SAFE_INTEGER:b.teachingOrder)||a.word.localeCompare(b.word,'mi'))
 return <main><header><a href="/translation-sheets.html">← Sheets</a><strong>KA PIKI</strong><h1>Vocabulary progression</h1></header>
 <section className="toolbar" aria-label="Vocabulary filters">
 <div className="pos-buttons" aria-label="Word type">{['all',...types,...COURSE_VERB_TYPES].map(t=><button key={t} aria-pressed={type===t} onClick={()=>setType(t)}>{t==='all'?'All':t==='Noun'?'Nouns':t}</button>)}</div>
 <nav className="level-jumps" aria-label="Jump to level">{levels.map(l=><button key={l} onClick={()=>jumpToLevel(l)}>Level {l}</button>)}</nav></section>
 <div className="key"><span>{data?`${visible.length} words`:error||'Loading vocabulary…'}</span><span><i className="first"/> Introduced <i className="known"/> Reused</span></div>
 <>
 {!visible.length?<p>No matching words.</p>:<div className="grid-scroll" ref={gridRef} tabIndex={0} aria-label="Cumulative vocabulary across 60 lessons"><table><caption>Planned vocabulary by lesson</caption><thead><tr><th className="word-heading" rowSpan={2}>Word</th>{levels.map(level=><th className="level" data-level={level} key={level} colSpan={10}>Level {level}</th>)}</tr><tr>{columns.map(n=><th key={n} title={'Level '+Math.ceil(n/10)+', lesson '+((n-1)%10+1)+' · '+pacing.lessons[n-1].theme+(pacing.lessons[n-1].consolidation?' · Intentional recognition and revision lesson':'')} scope="col">{n}</th>)}</tr><tr><th className="word-heading count-label" title="Course vocabulary across all word types, including proposed additions">Total words</th>{wordTotals.total.map((n,i)=><th key={i} className="all-total">{n}</th>)}</tr><tr><th className="word-heading count-label" title="New course vocabulary this lesson, across all word types">New words</th>{wordTotals.added.map((n,i)=><th key={i} className="new-total">{n}</th>)}</tr></thead><tbody>{visible.map(w=><tr key={w.word}><th scope="row"><strong lang="mi">{w.displayWord}</strong><small>{w.english}{w.status==='planned'?' · Draft':''}</small></th>{columns.map(n=><td key={n} className={(n===w.firstLesson?'first':n>w.firstLesson!?'known':'')+(n%10===0?' boundary':'')} title={w.displayWord+' · Lesson '+n+': '+(n===w.firstLesson?'introduced':n>w.firstLesson!?'available to reuse':'not yet introduced')}><span className="sr-only">{n===w.firstLesson?'Introduced':n>w.firstLesson!?'Available to reuse':'Not yet'}</span>{n===w.firstLesson?<span aria-hidden="true">{w.status==='planned'?'○':'●'}</span>:''}</td>)}</tr>)}</tbody></table></div>}
 </>
 </main>
}
createRoot(document.getElementById('root')!).render(<App/> )
