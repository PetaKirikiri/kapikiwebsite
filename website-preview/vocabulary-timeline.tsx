import React, {useEffect, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useCourseCurriculum} from '../src/lib/courseCurriculum'
import {COURSE_VERB_TYPES,isCourseVerbType} from '../src/lib/courseVocabularyTypes'
import {lessonWordTotals} from '../src/lib/vocabularyTimeline'
import './vocabulary-timeline.css'
import {familyLabels,wordFamily,progressionWords} from './vocabulary-timeline-view'
const levels=[1,2,3,4,5,6] as const
const reasons=['Too early','Too late','Too difficult','Not useful here','Doesn’t fit the topic','Prerequisites missing','Wrong word type']
type Review={word:string;lesson:number;reasons:string[];note:string;targetLesson:number|null}
const columns=Array.from({length:60},(_,i)=>i+1)
function App(){
 const {data,error}=useCourseCurriculum()
 const words=data?.lessons.flatMap(lesson=>lesson.timeline)??[]
 const wordTotals=lessonWordTotals(words)
 const pacing={lessons:data?.lessons.map(lesson=>lesson.pacing)??[]}
 const gridRef=useRef<HTMLDivElement>(null)
 function jumpToLevel(level:number){const grid=gridRef.current;const heading=grid?.querySelector<HTMLElement>(`[data-level="${level}"]`);const word=grid?.querySelector<HTMLElement>('.word-heading');if(grid&&heading)grid.scrollTo({left:heading.offsetLeft-(word?.offsetWidth??210),behavior:'smooth'})}

 const [reviews,setReviews]=useState<Record<string,Review>>({}),[editing,setEditing]=useState<Review|null>(null),[reviewError,setReviewError]=useState(''),[saving,setSaving]=useState(false)
 useEffect(()=>{fetch('/__vocabulary_reviews').then(r=>{if(!r.ok)throw Error();return r.json()}).then(setReviews).catch(()=>setReviewError('Flags couldn’t load. Refresh to retry.'))},[])
 const reviewFor=(word:string,lesson:number|null)=>reviews[`${word}:${lesson}`]??Object.values(reviews).find(r=>r.word===word||r.word===word.split(' · ')[0])
 const openReview=(word:string,lesson:number)=>setEditing(reviewFor(word,lesson)??{word,lesson,reasons:[],note:'',targetLesson:null})
 async function saveReview(clear=false){
  if(!editing)return;setSaving(true);setReviewError('')
  try{const response=await fetch('/__vocabulary_reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(clear?{...editing,reasons:[],note:'',targetLesson:null}:editing)});if(!response.ok)throw Error();setReviews(await response.json());setEditing(null)}catch{setReviewError('Couldn’t save. Please retry.')}finally{setSaving(false)}
 }

 const [selectedTypes,setSelectedTypes]=useState<string[]>([])
 const types=[...new Set(words.map(w=>w.type))].filter(type=>!isCourseVerbType(type)).sort()
 const visible=progressionWords(words,selectedTypes,pacing.lessons)
 return <main><header><a href="/translation-sheets.html">← Sheets</a><strong>KA PIKI</strong><h1>Vocabulary progression</h1></header>
 <section className="toolbar" aria-label="Vocabulary filters">
 <div className="pos-buttons" aria-label="Word type">{['all',...types,...COURSE_VERB_TYPES].map(t=><button key={t} aria-pressed={t==='all'?!selectedTypes.length:selectedTypes.includes(t)} onClick={()=>setSelectedTypes(current=>t==='all'?[]:current.includes(t)?current.filter(type=>type!==t):[...current,t])}>{t==='all'?'All':t==='Noun'?'Nouns':t}</button>)}</div>
 </section>
 <div className="key"><span>{data?`${visible.length} words`:error||'Loading vocabulary…'}</span><span><i className="first"/> Introduced <i className="known"/> Reused <i className="review-flagged"/> Review</span></div>
 <div className="family-key" aria-label="Teaching families">{Object.entries(familyLabels).map(([family,label])=><span key={family} className={`family-${family}`} title="Teaching group; course word types remain unchanged">{label}</span>)}</div>
 <>
 {!visible.length?<p>No matching words.</p>:<div className="grid-scroll" ref={gridRef} tabIndex={0} aria-label="Cumulative vocabulary across 60 lessons"><table><caption>Planned vocabulary by lesson</caption><thead><tr><th className="word-heading" rowSpan={2}>Word</th>{levels.map(level=><th className="level" data-level={level} key={level} colSpan={10}><button onClick={()=>jumpToLevel(level)} aria-label={`Show Level ${level} weeks`}>Level {level}</button></th>)}</tr><tr>{columns.map(n=><th key={n} title={'Level '+Math.ceil(n/10)+', lesson '+((n-1)%10+1)+' · '+pacing.lessons[n-1].theme+(pacing.lessons[n-1].consolidation?' · Intentional recognition and revision lesson':'')} scope="col">{n}</th>)}</tr><tr><th className="word-heading count-label" title="Course vocabulary across all word types, including proposed additions">Total words</th>{wordTotals.total.map((n,i)=><th key={i} className="all-total">{n}</th>)}</tr><tr><th className="word-heading count-label" title="New course vocabulary this lesson, across all word types">New words</th>{wordTotals.added.map((n,i)=><th key={i} className="new-total">{n}</th>)}</tr></thead><tbody>{visible.map((w,index)=><React.Fragment key={w.word}>{(index===0||Math.ceil(visible[index-1].firstLesson!/10)!==Math.ceil(w.firstLesson!/10))&&<tr className="level-divider"><th scope="row">Level {Math.ceil(w.firstLesson!/10)}</th><td colSpan={60}/></tr>}<tr className={`family-${wordFamily(w)} type-${w.type.replaceAll(' ','-').toLowerCase()}${reviewFor(w.word,w.firstLesson)?' review-flagged':''}`}><th scope="row" title={reviewFor(w.word,w.firstLesson)?[...reviewFor(w.word,w.firstLesson)!.reasons,reviewFor(w.word,w.firstLesson)!.note].filter(Boolean).join(' · '):`${familyLabels[wordFamily(w)]} · ${w.type} · Week ${w.firstLesson}`}><strong lang="mi">{w.displayWord}</strong><small>{w.english}{w.status==='planned'?' · Draft':''}</small></th>{columns.map(n=><td key={n} className={(n===w.firstLesson?'first'+(reviewFor(w.word,n)?' review-flagged':''):n>w.firstLesson!?'known':'')+(n%10===0?' boundary':'')} title={w.displayWord+' · Lesson '+n+': '+(n===w.firstLesson?'introduced':n>w.firstLesson!?'available to reuse':'not yet introduced')}><span className="sr-only">{n===w.firstLesson?'Introduced':n>w.firstLesson!?'Available to reuse':'Not yet'}</span>{n===w.firstLesson?<button className={'intro-dot'+(reviewFor(w.word,n)?' flagged':'')} aria-label={`Review ${w.displayWord}, lesson ${n}${reviewFor(w.word,n)?', flagged: '+[...reviewFor(w.word,n)!.reasons,reviewFor(w.word,n)!.note].filter(Boolean).join('; '):''}`} onClick={()=>openReview(w.word,n)}>{reviewFor(w.word,n)?'⚑':w.status==='planned'?'○':'●'}</button>:''}</td>)}</tr></React.Fragment>)}</tbody></table></div>}
 </>
 {reviewError&&!editing&&<p role="alert">{reviewError}</p>}
 {editing&&<div className="review-backdrop"><dialog ref={node=>{if(node&&!node.open)node.showModal()}} onCancel={e=>{e.preventDefault();if(!saving)setEditing(null)}} aria-labelledby="review-title" onKeyDown={e=>{if(e.key==='Escape'&&!saving)setEditing(null)}}><form onSubmit={e=>{e.preventDefault();void saveReview()}}>
 <h2 id="review-title">{editing.word.split(' · ')[0]} · Level {Math.ceil(editing.lesson/10)}, lesson {(editing.lesson-1)%10+1}</h2>
 <div className="review-reasons">{reasons.map(reason=><label key={reason}><input type="checkbox" checked={editing.reasons.includes(reason)} onChange={e=>setEditing({...editing,reasons:e.target.checked?[...editing.reasons,reason]:editing.reasons.filter(r=>r!==reason)})}/>{reason}</label>)}</div>
 <label>Move to (optional)<select value={editing.targetLesson??''} onChange={e=>setEditing({...editing,targetLesson:e.target.value?Number(e.target.value):null})}><option value="">Decide during review</option>{columns.map(n=><option key={n} value={n}>Level {Math.ceil(n/10)} · Lesson {(n-1)%10+1}</option>)}</select></label>
 <label>Note (optional)<textarea maxLength={2000} value={editing.note} onChange={e=>setEditing({...editing,note:e.target.value})}/></label>
 {reviewError&&<p role="alert">{reviewError}</p>}<div className="review-actions"><button type="button" disabled={saving} onClick={()=>void saveReview(true)}>Clear flag</button><button type="button" disabled={saving} onClick={()=>setEditing(null)}>Cancel</button><button disabled={saving||(!editing.reasons.length&&!editing.note.trim()&&!editing.targetLesson)}>{saving?'Saving…':'Save flag'}</button></div>
 </form></dialog></div>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/> )
