import type { MoeBenefitId } from '../lib/moeBenefits'

const ICONS = {
  'conversation': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 14H8l-5 4v-5a3 3 0 0 1-1-2V6a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3Zm6-6a3 3 0 0 1 2 3v5a3 3 0 0 1-1 2v4l-5-3h-5a3 3 0 0 1-3-2"/></svg>,
  'certificate': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1M6 7h12M6 11h4m8 6 2 5-3-1-3 1 2-5"/><circle cx="17" cy="14" r="3"/></svg>,
  'duration': <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  'document': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H5v20h14V7Zm0 0v5h5M8 11h8m-8 4h8m-8 3h5"/></svg>,
  'ideas': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 15a7 7 0 1 1 8 0l-1 3H9Zm1 6h6m-3-3v-6m-2-2 2 2 2-2"/></svg>,
  'game': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h10a4 4 0 0 1 4 3l2 9a2 2 0 0 1-3 2l-4-4H8l-4 4a2 2 0 0 1-3-2l2-9a4 4 0 0 1 4-3ZM5 11h6m-3-3v6"/><circle cx="16" cy="10" r=".8"/><circle cx="19" cy="13" r=".8"/></svg>,
  'levels': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h6v-6h6V8h6V3M3 20h18" /></svg>,
  'course-length': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 9h3m-3 3h7" /></svg>,
  'live-classes': <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/></svg>,
  'app': <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2M9 11l2 2 4-4"/></svg>,
  'recorded-lessons': <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="m10 8 5 3-5 3ZM8 21h8"/></svg>,
  'digital-syllabus': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15M5 8h3m-3 4h3m8-4h3m-3 4h3"/></svg>,
  'bespoke-activities': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6M6 22h6m-3-4v4m4-14 8 8-5 1-2 5Z"/></svg>,
  'stories-games': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15M5 8h3m-3 4h3m8-4h3m-3 4h3"/></svg>,
  'progress-reports': <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H5v20h14V7Zm0 0v5h5M8 17v-3m4 3v-6m4 6v-4"/></svg>,
  'student-management': <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/></svg>,
  'class-bookings': <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 6 3 3 5-6"/></svg>,
  'public-sector-capability': <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m9 12 2 2 4-4"/></svg>,
}

export type MoeIconId = keyof typeof ICONS | MoeBenefitId

export default function MoeBenefitIcon({ id }: { id: MoeIconId }) {
  const icon = id === 'capability-reference' ? 'document' : id === 'learning-support' ? 'app' : id === 'professional-learning' ? 'conversation' : id === 'course-certificate' ? 'certificate' : id === 'everyday-reo' ? 'conversation' : id
  return ICONS[icon]
}
