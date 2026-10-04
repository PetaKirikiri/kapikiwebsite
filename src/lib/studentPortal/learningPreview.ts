import type { LearningData, LearningRecord } from './learning'

const record = (id: string, kind: LearningRecord['kind'], title: string, status: string, detail = '', occurred_on: string | null = null, score: number | null = null, total: number | null = null): LearningRecord => ({ id, kind, title, status, detail, occurred_on, score, total, level: 1 })

export const learningPreview: LearningData = {
  lessons: [
    { id: 'preview-next', title: 'Pepeha', level: 1, startsAt: '2026-10-05T09:00:00+13:00', endsAt: '2026-10-05T10:00:00+13:00', timezone: 'Pacific/Auckland', notes: [] },
    { id: 'preview-four', title: 'Tōku whānau', level: 1, startsAt: '2026-09-28T09:00:00+13:00', endsAt: '2026-09-28T10:00:00+13:00', timezone: 'Pacific/Auckland', notes: [
      { title: 'Class notes', body: 'Practise the family section of your pepeha. Use the course reading to review the examples, then prepare the section you want to share in class.' },
      { title: 'Before the next class', body: 'Read your pepeha aloud. Bring any words or questions you would like to work through together.' },
    ] },
    { id: 'preview-three', title: 'Nō hea koe?', level: 1, startsAt: '2026-09-21T09:00:00+12:00', endsAt: '2026-09-21T10:00:00+12:00', timezone: 'Pacific/Auckland', notes: [
      { title: 'Class notes', body: 'Review the section about where you are from in the Level 1 reading. Practise asking and answering with a partner.' },
    ] },
  ],
  interests: [],
  training: [],
  assessments: [],
  records: [
    record('course-1', 'course', 'Level 1 · Pepeha', 'attending', 'Live online · Monday mornings'),
    { ...record('course-2', 'course', 'Level 2', 'booked', ''), level: 2 },
    record('attendance-1', 'attendance', 'Pepeha · Class 4', 'present', '', '2026-09-28'),
    record('attendance-2', 'attendance', 'Pepeha · Class 3', 'present', '', '2026-09-21'),
    record('attendance-3', 'attendance', 'Pepeha · Class 2', 'absent', '', '2026-09-14'),
    record('attendance-4', 'attendance', 'Pepeha · Class 1', 'present', '', '2026-09-07'),
    record('learning-1', 'learning', 'Ko wai tō ingoa?', 'completed', 'Asking someone’s name', '2026-09-28'),
    record('learning-2', 'learning', 'Nō hea koe?', 'completed', 'Asking where someone is from', '2026-09-21'),
    record('learning-3', 'learning', 'Tōku whānau', 'in_progress', 'Talking about my family', '2026-09-28'),
    record('activity-1', 'activity', 'Pepeha · Sentence practice', 'in_progress', '8 of 12 questions completed', '2026-09-28'),
  ],
}
