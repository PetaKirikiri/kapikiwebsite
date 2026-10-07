import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import bank from '../docs/curriculum/translation-bank/sheets.json'
import { LEVEL_PRESENTATION } from '../src/lib/coursePresentation'
import referencePlan from '../docs/curriculum/translation-bank/reference-progression.json'
import audit from '../docs/curriculum/translation-bank/audit.json'
import './translation-sheets.css'
const levelNames = ['Pepeha', 'Actions & time', 'Negatives', 'Ownership & emphasis', 'Expression & ability', 'Questions & conditions']
function App() {
  const initial = /^#level-(\d)-lesson-(\d+)$/.exec(location.hash)
  const [level, setLevel] = useState(Math.min(6, Math.max(1, Number(initial?.[1] || 1))))
  const [lesson, setLesson] = useState(Math.min(10, Math.max(1, Number(initial?.[2] || 1))))
  const [page, setPage] = useState(0)
  const [auditing, setAuditing] = useState(false)
  const [answers, setAnswers] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const sheet = bank.sheets.find(s => s.level === level && s.lesson === lesson)!
  const isIntro = level === 1 && lesson === 1
  const [choices, setChoices] = useState<Record<string, string>>({})
  const size = presentation ? 1 : 10
  const pages = Math.ceil(50 / size)
  const select = (l: number, n: number) => {
    setLevel(l); setLesson(n); setPage(0); setAnswers(false); setRevealed(new Set())
    history.replaceState(null, '', `#level-${l}-lesson-${n}`)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'ka-piki-60-translation-sheets.json'; link.click(); URL.revokeObjectURL(url)
  }
  return <main className={presentation ? 'presentation' : ''}>
    <header><div className="brand">KA PIKI <span>Translation sheets</span></div><div className="tools"><span className="draft">Teacher-review draft</span><button aria-pressed={auditing} onClick={() => setAuditing(!auditing)}>{auditing ? 'Back to sheets' : 'Content audit'}</button><button onClick={download}>Download bank</button><button onClick={() => window.print()}>Print sheet</button></div></header>
    <nav aria-label="Levels" className="levels">{levelNames.map((name, i) => <button key={name} aria-current={level === i + 1 ? 'page' : undefined} onClick={() => select(i + 1, 1)}><small>Level {i + 1}</small>{name}</button>)}</nav>
    <nav aria-label="Lessons" className="lessons">{Array.from({ length: 10 }, (_, i) => <button key={i} aria-current={lesson === i + 1 ? 'page' : undefined} onClick={() => select(level, i + 1)}>Lesson {i + 1}</button>)}</nav>
    {auditing ? <section className="sheet audit"><h1>Content audit · Level {level}</h1><p>{LEVEL_PRESENTATION[level as keyof typeof LEVEL_PRESENTATION].capability}. Story sentences are included in the level’s practice; this remains a teacher-review draft.</p><h2>Pronouns & determiners</h2><table><thead><tr><th>Lesson</th><th>Introduce / practise</th></tr></thead><tbody>{referencePlan.groups.filter(g => g.level === level).map((g,i) => <tr key={i}><td>Lesson {g.lesson}</td><td>{g.forms.join(' · ')}</td></tr>)}</tbody></table><h2>Exercises</h2><table><thead><tr><th>Lesson</th><th>Finding</th><th>Progression</th></tr></thead><tbody>{audit.filter(row => row.level === level).map(row => <tr key={row.lesson}><td><button onClick={() => { select(level, row.lesson); setAuditing(false) }}>Lesson {row.lesson}</button><small>{row.title}</small></td><td>{row.status}</td><td>{row.note}<small>{row.distinctPairs} distinct prompts · {row.reviewQuestions} review questions</small></td></tr>)}</tbody></table></section> : <section className="sheet">
      <div className="sheet-heading"><div><p>LEVEL {level} · LESSON {lesson} · 50 QUESTIONS</p><h1>{sheet.title}</h1><span className="pattern">{sheet.pattern}</span></div><div className="tools"><button aria-pressed={presentation} onClick={() => { setPresentation(!presentation); setPage(0) }}>{presentation ? 'Sheet view' : 'Present'}</button><button aria-pressed={answers} onClick={() => { setAnswers(!answers); setRevealed(new Set()) }}>{answers ? 'Hide answers' : 'Show answers'}</button></div></div>
      <div className="questions">{sheet.questions.map((q, index) => {
        const visible = index >= page * size && index < (page + 1) * size
        const show = answers ? !revealed.has(q.id) : revealed.has(q.id)
        const structure = q.direction === 'structure-choice'
        const selected = choices[q.id]
        return <article key={q.id} className={`question ${visible ? '' : 'off-page'}`}><span className="number">{index + 1}</span><div className="question-body"><small>{structure ? q.choiceLabel : q.direction === 'mi-en' ? 'Māori → English' : 'English → Māori'}</small><p lang={q.direction === 'mi-en' ? 'mi' : 'en'}>{q.direction === 'mi-en' ? q.mi : q.en}</p>{structure ? <>{q.context && <p lang="mi">{q.context}</p>}<div className="big-word-choices" role="group" aria-label={`Big Word for question ${index+1}`}>{q.options.map(option => <button key={option} aria-pressed={selected===option} onClick={() => setChoices(current => ({...current,[q.id]:option}))}>{option}</button>)}</div><div className="choice-feedback" role="status">{selected ? q.acceptedAnswers.includes(selected) ? 'Correct' : 'Try again' : ''}{show && <span>Answer: {q.acceptedAnswers.join(' / ')}</span>}</div></> : <div className={`answer ${show ? 'shown' : ''}`} lang={q.direction === 'mi-en' ? 'en' : 'mi'}>{show ? (q.direction === 'mi-en' ? q.en : q.mi) : <span className="answer-line" />}</div>}</div><button className="reveal" aria-label={`${show ? 'Hide' : 'Reveal'} answer ${index + 1}`} aria-expanded={show} onClick={() => setRevealed(current => { const next = new Set(current); if (next.has(q.id)) next.delete(q.id); else next.add(q.id); return next })}>{show ? '−' : '+'}</button></article>
      })}</div>
      <footer><button disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button><span>{page * size + 1}–{Math.min((page + 1) * size, 50)} of 50</span><button disabled={page === pages - 1} onClick={() => setPage(page + 1)}>Next →</button></footer>
    </section>}
    <details className="review-notes"><summary>Lesson progression</summary><p>{isIntro ? "Read each English sentence and choose Ko, Nō, He, Kei, E, Toko-, Kotahi or Kāorekau. This introductory activity recognises the sentence meaning; it does not ask for a full Māori translation." : sheet.progressionNote}</p><p hidden={isIntro}>{sheet.distinctPairs} distinct sentence pairs across 50 attempts. Structure choices and translations in both directions revisit earlier learning. Repetition is intentional; answers shown are examples, not the only acceptable translations.</p><p hidden={isIntro}>{sheet.reviewSources.length ? `Review from ${sheet.reviewSources.join(', ')}.` : 'First lesson: repeat the same four people words in complete sentences.'}</p><p hidden={isIntro}>New forms: {sheet.newForms.length ? sheet.newForms.join(' · ') : 'None — reuse familiar language.'}</p><a href="https://blog.duolingo.com/the-nuts-and-bolts-of-course-creation-at-duolingo/" target="_blank" rel="noreferrer">Progression reference: Duolingo course design</a></details>
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
