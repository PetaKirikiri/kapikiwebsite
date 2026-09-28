import type { CurriculumLevel } from './sentenceStructureLevels'
import { findMoeBenefit, type MoeBenefitId } from './moeBenefits'

export const MOE_CLASSES = [
  { day: 'Monday', startDate: '12 October', sessions: [
    { level: 1, time: '1pm – 2pm', title: 'Level 1', description: 'Introduce yourself and describe your world.' },
    { level: 2, time: '2pm – 3pm', title: 'Level 2', description: 'Talk about what happens and when.' },
  ] },
  { day: 'Tuesday', startDate: '13 October', sessions: [
    { level: 3, time: '1pm – 2pm', title: 'Level 3', description: 'Express your needs and give instructions.' },
    { level: 4, time: '2pm – 3pm', title: 'Level 4', description: 'Explain belonging, purpose and responsibility.' },
  ] },
  { day: 'Wednesday', startDate: '14 October', sessions: [
    { level: 6, time: '1pm – 2pm', title: 'Kōrero Club', description: 'Put your reo into conversation.' },
    { level: 5, time: '2pm – 3pm', title: 'Level 5', description: 'Compare ideas and express what is possible.' },
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
