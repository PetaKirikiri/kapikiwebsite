import type { WebsitePreviewSentence } from './WebsiteView'
import { CURRICULUM_LEVELS, type CurriculumLevel } from '../lib/sentenceStructureLevels'
import NavigationRail from './NavigationRail'

// Editorial summaries of the course. Structure membership and counts come from the live roster.
const LEVEL_PRESENTATION = {
  1: { welcome: 'Start with the language to introduce yourself and describe the world around you.', title: 'Foundations', phrase: 'Ko · He', topics: ['Pepeha', 'Pronunciation', 'Vocabulary', 'Sentence patterns'] },
  2: { welcome: 'Build on your foundations to talk about where things are and what is happening.', title: 'Actions & time', phrase: 'I · Kei te · Ka', topics: ['Position', 'Past & present', 'Future actions', 'What should happen'] },
  3: { welcome: 'Expand your everyday language with ways to say no, give instructions and express what you want.', title: 'Negatives & instructions', phrase: 'Kāore · Kaua', topics: ['Negatives', 'Not yet', 'Instructions', 'Desired outcomes'] },
  4: { welcome: 'Make your meaning clearer when talking about belonging, purpose and who is doing what.', title: 'Ownership & emphasis', phrase: 'Nā · Nō · Mā · Mō', topics: ['Belonging', 'Who it is for', 'Who did it', 'Who will do it'] },
  5: { welcome: 'Develop more ways to express yourself through comparisons, ability and different perspectives.', title: 'Expression & ability', phrase: 'Ka taea', topics: ['Comparisons', 'Habits', 'Ability', 'Passive sentences'] },
  6: { welcome: 'Keep the conversation going with questions about why, when and what might happen.', title: 'Questions & conditions', phrase: 'He aha?', topics: ['Why?', 'When?', 'What if?', 'Negative questions'] },
} as const

// Familiar interface symbols for scanning course topics; these are not grammar shapes.
const TOPIC_ICONS = {
  person: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M16 8h6m-3-3v6',
  voice: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8',
  book: 'M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15',
  pattern: 'M3 4h7v6H3ZM14 4h7v6h-7ZM3 15h7v6H3ZM14 15h7v6h-7ZM6 10v5m11-5v5',
  position: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  target: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  negative: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 12h8',
  instruction: 'M9 6h12M9 12h12M9 18h12M3 5l1 1 2-2M3 11l1 1 2-2M3 17l1 1 2-2',
  home: 'M3 10l9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  gift: 'M3 8h18v4H3ZM5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z',
  compare: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  repeat: 'M20 7H8a5 5 0 0 0-5 5m13-9 4 4-4 4M4 17h12a5 5 0 0 0 5-5M8 13l-4 4 4 4',
  ability: 'm13 2-9 12h7l-1 8 10-12h-7l1-8Z',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  question: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01',
} as const
const LEVEL_ICONS = {
  1: ['person', 'voice', 'book', 'pattern'],
  2: ['position', 'clock', 'arrow', 'target'],
  3: ['negative', 'clock', 'instruction', 'target'],
  4: ['home', 'gift', 'person', 'arrow'],
  5: ['compare', 'repeat', 'ability', 'layers'],
  6: ['question', 'clock', 'compare', 'negative'],
} as const

export default function LevelCourseOverview({ sentences, onSelect }: {
  sentences: readonly WebsitePreviewSentence[]; onSelect: (level: CurriculumLevel) => void
}) {
  return <div className="level-course-grid" aria-label="Course levels">
    {CURRICULUM_LEVELS.map(level => {
      const count = sentences.filter(sentence => sentence.curriculumLevel === level).length
      const { title, phrase, topics, welcome } = LEVEL_PRESENTATION[level]
      return <article key={level} className={`level-course-card level-course-card-${level}`} aria-labelledby={`course-level-${level}`}>
        <div className="level-course-cover">
          <div className="level-course-cover-top">
            <span id={`course-level-${level}`} className="level-course-label">Level {level}</span>
            <span className="level-course-sequence" aria-hidden="true">{CURRICULUM_LEVELS.map(step => <i key={step} className={step <= level ? 'is-filled' : undefined} />)}</span>
          </div>
          <p className="level-course-phrase" lang="mi">{phrase}</p>
          <div className="level-course-brand" aria-hidden="true"><NavigationRail noun={level === 1 || level === 4} /></div>
        </div>
        <div className="level-course-body">
          <h2>{title}</h2>
          <p className="level-course-welcome">{welcome}</p>
          <ul className="level-course-topics-list">{topics.map((topic, index) => <li key={topic}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={TOPIC_ICONS[LEVEL_ICONS[level][index]]} /></svg>
            <span>{topic}</span>
          </li>)}</ul>
          <footer className="level-course-footer">
            <span className="level-course-count">{count} sentence {count === 1 ? 'structure' : 'structures'}</span>
            <button type="button" className="level-course-learn-more" aria-label={`Learn more about Level ${level}`} onClick={() => onSelect(level)}>Learn more <span aria-hidden="true">↗</span></button>
          </footer>
        </div>
      </article>
    })}
  </div>
}
