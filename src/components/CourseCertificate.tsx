import KaPikiWordmark from './KaPikiWordmark'
import { LEVEL_PRESENTATION } from '../lib/coursePresentation'
import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import './CourseCertificate.css'

type CourseCertificateProps = {
  recipient?: string
  level?: CurriculumLevel
  awardedOn?: string
}

/** A visual course-certificate sample; issuing an award is a separate workflow. */
export default function CourseCertificate({ recipient = 'Your name', level = 1, awardedOn }: CourseCertificateProps) {
  return <article className="course-certificate" aria-label="Sample Ka Piki course certificate">
    <div className="course-certificate-band" aria-hidden="true" />
    <div className="course-certificate-paper">
      <header className="course-certificate-brand">
        <KaPikiWordmark />
        <span className="course-certificate-sample">Sample</span>
      </header>
      <div className="course-certificate-award">
        <p className="course-certificate-subject">Te reo Māori</p>
        <h2>Certificate of achievement</h2>
        <p className="course-certificate-recipient">{recipient}</p>
        <p className="course-certificate-statement">has successfully passed</p>
        <p className="course-certificate-course">Level {level} · {LEVEL_PRESENTATION[level].title}</p>
      </div>
      <footer className="course-certificate-details">
        <div><strong>Ka Piki</strong><span>Course provider</span></div>
        <div><strong>{awardedOn || '—'}</strong><span>Date awarded</span></div>
      </footer>
    </div>
  </article>
}
