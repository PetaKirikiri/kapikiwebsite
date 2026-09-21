import './CourseFormat.css'

const COURSE_FORMAT = [
  { title: '10 weeks', detail: 'Each course', icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h3m-3 4h7' },
  { title: '1 hour a week', detail: 'Live online with a teacher', icon: 'M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM8 22h8m-4-4v4M9 7l6 4-6 4V7Z' },
  { title: 'App access', detail: 'Practice between classes', icon: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm2 3h6m-4 14h2M9 11l2 2 4-4' },
] as const

export default function CourseFormat() {
  return <section className="course-format" aria-labelledby="course-format-heading">
    <h2 id="course-format-heading">How the courses run</h2>
    <dl className="course-format-facts">
      {COURSE_FORMAT.map(({ title, detail, icon }) => <div key={title} className="course-format-fact">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={icon} /></svg>
        <div><dt>{title}</dt><dd>{detail}</dd></div>
      </div>)}
    </dl>
    <div className="course-format-approach">
      <h3>Build a feel for the language.</h3>
      <p>Visual models make grammar easier to understand, so you can focus on using the language. Through practical activities and repetition, you build confidence and an intuitive sense of how sentences fit together.</p>
    </div>
  </section>
}
