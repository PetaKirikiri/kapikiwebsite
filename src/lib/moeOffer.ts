import type { CurriculumLevel } from './sentenceStructureLevels'
import { findMoeBenefit, type MoeBenefitId } from './moeBenefits'

export const MOE_COURSE_PRICE_AMOUNT = '$300'
export const MOE_COURSE_PRICE = `${MOE_COURSE_PRICE_AMOUNT} per student`
export const MOE_COURSE_INCLUSIONS = '10 hours of live online classes: one hour weekly for 10 weeks, plus access to the app.'

export const MOE_CLASSES = [
  { day: 'Monday', firstDate: '2026-10-19', startDate: '19 October', sessions: [
    { level: 1, time: '1pm – 2pm', startHour: 13, title: 'Level 1', description: 'Introduce yourself and describe your world.' },
    { level: 2, time: '2pm – 3pm', startHour: 14, title: 'Level 2', description: 'Talk about what happens and when.' },
  ] },
  { day: 'Tuesday', firstDate: '2026-10-20', startDate: '20 October', sessions: [
    { level: 3, time: '1pm – 2pm', startHour: 13, title: 'Level 3', description: 'Express your needs and give instructions.' },
    { level: 4, time: '2pm – 3pm', startHour: 14, title: 'Level 4', description: 'Explain belonging, purpose and responsibility.' },
  ] },
  { day: 'Wednesday', firstDate: '2026-10-21', startDate: '21 October', sessions: [
    { level: 6, time: '1pm – 2pm', startHour: 13, title: 'Kōrero Club', description: 'Put your reo into conversation.' },
    { level: 5, time: '2pm – 3pm', startHour: 14, title: 'Level 5', description: 'Compare ideas and express what is possible.' },
  ] },
] as const


export function moeLevelRoute(level?: CurriculumLevel) {
  return level ? `#moe/levels/${level}` : '#moe/levels'
}

export function readMoeRoute(hash: string): { level: CurriculumLevel | null; overview: boolean; feature?: MoeBenefitId } | null {
  const benefit = /^#moe\/benefits\/([a-z-]+)$/.exec(hash)
  if (benefit) {
    const feature = findMoeBenefit(benefit[1])
    return feature ? { level: null, overview: false, feature: feature.id } : null
  }
  const match = /^#moe(?:\/levels(?:\/([1-6]))?)?$/.exec(hash)
  return match ? { level: match[1] ? Number(match[1]) as CurriculumLevel : null, overview: hash === '#moe/levels' } : null
}

export function moeInterestContext(level: CurriculumLevel) {
  for (const { day, startDate, sessions } of MOE_CLASSES) {
    const session = sessions.find(session => session.level === level)
    if (session) return `MOE · ${day} ${session.time} · ${session.title}${level === 6 ? ' (Level 6)' : ''} · Starts ${startDate} 2026 · New Zealand time`
  }
  throw new Error('No MOE class for this level')
}

/** Ten weekly sessions from the published MOE intake, in NZ daylight time. */
export function moeLessonSchedule(level: number, lessonNumber: number) {
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 10) return null
  const day = MOE_CLASSES.find(day => day.sessions.some(session => session.level === level))
  const session = day?.sessions.find(session => session.level === level)
  if (!day || !session) return null
  const date = new Date(`${day.firstDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + (lessonNumber - 1) * 7)
  const datePart = date.toISOString().slice(0, 10)
  return { startsAt: `${datePart}T${session.startHour}:00:00+13:00`, endsAt: `${datePart}T${session.startHour + 1}:00:00+13:00`, timezone: 'Pacific/Auckland' }
}
