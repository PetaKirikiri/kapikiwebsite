import { useState } from 'react'
import { breakoutChoices, breakoutRounds, bigWordBreakout, type BigWordChoice } from '../../lib/lessons/bigWordBreakout'
import BigWordChooser from './BigWordChooser'
import './BigWordBreakout.css'

export default function LessonBreakout() {
  const [round,setRound]=useState(0)
  const [active,setActive]=useState<string | null>(null)
  const [answers,setAnswers]=useState<Record<string,BigWordChoice>>({})
  const [checked,setChecked]=useState<Record<string,boolean>>({})
  const questions=breakoutRounds[round]
  const score=bigWordBreakout.filter(q=>checked[q.id]&&answers[q.id]===q.word).length
  return <section className="lesson-teaching-card lesson-breakout big-word-breakout" aria-label="Big words breakout exercise">
    <header className="breakout-heading"><h1>Choose the Big word</h1><span aria-label={`${score} of 50 correct`}>{score} / 50</span></header>
    <div className="breakout-rounds" role="group" aria-label="Question sets">{breakoutRounds.map((_,i)=><button key={i} type="button" aria-pressed={round===i} aria-label={`Questions ${i*5+1} to ${i*5+5}`} onClick={()=>{setRound(i);setActive(null)}}>{i*5+1}–{i*5+5}</button>)}</div>
    <ol className="breakout-prompts" start={round*5+1}>{questions.map(q=><li key={q.id}>
      <button type="button" className="breakout-prompt" aria-haspopup="dialog" aria-expanded={active===q.id} onClick={()=>setActive(q.id)} aria-label={`${q.english} ${answers[q.id] || 'Choose a Big word'}`}>
        <span>{q.english}{q.hard&&<small className="breakout-hard">Challenge</small>}</span>
        <strong>{answers[q.id] || '…'}</strong>
        {checked[q.id]&&<span aria-label={answers[q.id]===q.word?'Correct':'Try again'}>{answers[q.id]===q.word?'✓':'↻'}</span>}
      </button>
    </li>)}</ol>
    <BigWordChooser question={bigWordBreakout.find(q=>q.id===active)?.english ?? null} onClose={()=>setActive(null)} onSelect={word=>{
      const choice = breakoutChoices.find(candidate=>candidate.toLocaleLowerCase()===word.toLocaleLowerCase())
      if (!active || !choice) return
      setAnswers(previous=>({...previous,[active]:choice}))
      setChecked(previous=>({...previous,[active]:false}))
      setActive(null)
    }} />
    <footer className="breakout-check"><button type="button" disabled={questions.some(q=>!answers[q.id])} onClick={()=>setChecked(previous=>({...previous,...Object.fromEntries(questions.map(q=>[q.id,true]))}))}>Check</button><span role="status">{questions.every(q=>checked[q.id])?(questions.every(q=>answers[q.id]===q.word)?'All five correct':'Try the marked answers again'):''}</span></footer>
  </section>
}
