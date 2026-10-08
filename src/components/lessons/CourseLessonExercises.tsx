import { useEffect, useState } from 'react'
import { studentClient } from '../../lib/studentPortal/client'

type Question = { id: string; mi: string; en: string; direction: string; options?: string[]; choiceLabel?: string; context?: string }
export default function CourseLessonExercises({ level, lesson }: { level: number; lesson: number }) {
  const [data, setData] = useState<{ sheet: { title: string }; questions: Question[] } | null>(null)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const token = (await studentClient?.auth.getSession())?.data.session?.access_token
      const response = await fetch(`/__course_lesson?level=${level}&lesson=${lesson}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token ?? ''}` } })
      const value = await response.json()
      if (!response.ok) throw new Error(value.error)
      if (!controller.signal.aborted) setData(value)
    })().catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [level, lesson])
  async function check(value: string) {
    if (!data) return
    setBusy(true); setError(''); setAnswer(value)
    try {
      const token = (await studentClient?.auth.getSession())?.data.session?.access_token
      const response = await fetch('/__course_answer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ level, lesson, questionId: data.questions[index].id, answer: value }) })
      const valueResult = await response.json()
      if (!response.ok) throw new Error(valueResult.error)
      setResult(valueResult.correct)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not check. Retry.') } finally { setBusy(false) }
  }
  const question = data?.questions[index]
  return <section className="lesson-teaching-card" aria-label="Lesson exercises">
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading lesson…</p>}
    {question && <>
      <h1>{data?.sheet.title}</h1>
      <p lang={question.direction === 'mi-en' ? 'mi' : 'en'}>{question.direction === 'mi-en' ? question.mi : question.en}</p>
      {question.context && <p>{question.context}</p>}
      {question.direction === 'structure-choice' ? <div aria-label={question.choiceLabel ?? 'Choose'}>{question.options?.map(option => <button key={option} disabled={busy} aria-pressed={answer === option} onClick={() => void check(option)}>{option}</button>)}</div> : <form onSubmit={event => { event.preventDefault(); void check(answer) }}><label>Answer<input value={answer} onChange={event => { setAnswer(event.target.value); setResult(null) }} /></label><button disabled={busy || !answer.trim()}>Check</button></form>}
      {result !== null && <p role="status">{result ? 'Correct' : 'Try again'}</p>}
      {index + 1 < data!.questions.length && <button disabled={busy} onClick={() => { setIndex(index + 1); setAnswer(''); setResult(null) }}>Next</button>}
    </>}
  </section>
}
