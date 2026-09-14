import { useId, useState, type ReactNode } from 'react'

export default function CourseSentenceEntry({ number, title, explanation, children }: {
  number: number; title: string; explanation: string; children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return <section className="course-entry" aria-labelledby={`${id}-title`}>
    <header className="course-entry-heading" lang="en">
      <span className="course-entry-number" aria-label={`Structure ${number}`}>{String(number).padStart(2, '0')}</span>
      <h3 id={`${id}-title`}>{title}</h3>
      <button type="button" aria-label={`Explain ${title}`} aria-expanded={expanded} aria-controls={`${id}-explanation`} onClick={() => setExpanded(value => !value)}>
        {expanded ? 'Close' : 'Explain'}<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d={expanded ? 'M3 7.5 6 4.5 9 7.5' : 'M3 4.5 6 7.5 9 4.5'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </header>
    <div className="course-entry-content">{children}</div>
    <p id={`${id}-explanation`} className="course-entry-explanation" lang="en" hidden={!expanded}>{explanation}</p>
  </section>
}
