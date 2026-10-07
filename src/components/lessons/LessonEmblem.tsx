import { useId, type CSSProperties } from 'react'

export const STAGE_IDENTITIES = [
  { key: 'weave', colour: '#438ca0', light: '#def6ff', bright: '#96d7e8' },
  { key: 'fire', colour: '#d18346', light: '#fff0d3', bright: '#ffc08c' },
  { key: 'fern', colour: '#65983d', light: '#edf9d2', bright: '#b7dd83' },
  { key: 'water', colour: '#388fad', light: '#ddf5ff', bright: '#8ed8ef' },
  { key: 'stone', colour: '#9780be', light: '#f1e8ff', bright: '#d3baf1' },
  { key: 'feather', colour: '#bc9545', light: '#fff5d2', bright: '#f5d77f' },
] as const

export function stageIdentityStyle(stage: number): CSSProperties {
  const tone = STAGE_IDENTITIES[stage] ?? STAGE_IDENTITIES[0]
  return { '--stage-accent': tone.colour, '--stage-light': tone.light, '--stage-bright': tone.bright } as CSSProperties
}

/** Smooth miniature forms lit from the same direction as their surrounding controls. */
export default function LessonEmblem({ stage }: { stage: number }) {
  const tone = STAGE_IDENTITIES[stage] ?? STAGE_IDENTITIES[0]
  const id = `soft-emblem-${useId().replace(/:/g, '')}`
  const surface = `url(#${id})`
  const forms = [
    <g transform="rotate(-12 32 32)">
      <rect x="11" y="9" width="17" height="45" rx="8" fill={surface}/>
      <rect x="34" y="9" width="17" height="45" rx="8" fill={surface}/>
      <rect x="7" y="16" width="49" height="14" rx="7" fill={`url(#${id}-cream)`}/>
      <rect x="7" y="36" width="49" height="14" rx="7" fill={surface}/>
    </g>,
    <>
      <path d="M35 5c4 15-14 20-16 33-1 11 5 18 15 18 15 0 22-15 15-28-1 8-6 12-10 9-6-5 8-17-4-32Z" fill={surface}/>
      <path d="M34 29c1 9-10 12-7 20 2 6 12 7 15-1 2-6-5-10-8-19Z" fill={`url(#${id}-cream)`}/>
    </>,
    <>
      <path d="M20 56V34C20 18 30 8 42 8c12 0 19 10 16 21-3 12-20 15-26 5-5-9 3-18 10-15 6 2 6 9 1 10" fill="none" stroke={surface} strokeWidth="8" strokeLinecap="round"/>
      <path d="M24 48C9 50 6 41 9 35c9-2 16 3 15 13Z" fill={surface}/>
      <path d="M26 53c0-13 8-18 17-15 0 10-6 16-17 15Z" fill={surface}/>
    </>,
    <>
      <path d="M8 43c12 0 12-24 30-25 12-1 21 12 15 21-5 8-16 7-18 0-2-5 3-9 7-7 1-7-8-8-12-1-5 9-3 15-17 20-6 2-10-3-5-8Z" fill={surface}/>
      <path d="M9 48c10 2 17-4 25-3 8 1 12 5 22 1" fill="none" stroke={surface} strokeWidth="11" strokeLinecap="round"/>
      <path d="M24 30c7-16 24-13 26-2" fill="none" stroke={`url(#${id}-cream)`} strokeWidth="6" strokeLinecap="round"/>
    </>,
    <>
      <path d="M16 50C5 42 13 20 26 11c10-7 16-3 22 8 8 14 10 25 0 32-8 6-22 6-32-1Z" fill={surface}/>
      <path d="m28 20 9-5 4 12-9 8-9-5Z" fill={tone.light} opacity=".42"/>
    </>,
    <>
      <path d="M20 48C9 33 22 10 44 9c10 0 9 11 5 21-5 14-18 23-29 18Z" fill={surface}/>
      <path d="M17 56c7-13 16-25 27-37" fill="none" stroke={`url(#${id}-cream)`} strokeWidth="6" strokeLinecap="round"/>
    </>,
  ]
  return <svg className="lesson-emblem" data-emblem={tone.key} width="40" height="40" viewBox="0 0 64 66" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={id} cx=".3" cy=".15" r=".9">
        <stop stopColor={tone.light}/><stop offset=".5" stopColor={tone.bright}/><stop offset="1" stopColor={tone.colour}/>
      </radialGradient>
      <linearGradient id={`${id}-cream`} x2=".6" y2="1">
        <stop stopColor="#fffbea"/><stop offset=".55" stopColor="#ffe9aa"/><stop offset="1" stopColor="#daba6a"/>
      </linearGradient>
      <filter id={`${id}-shadow`} x="-25%" y="-20%" width="155%" height="155%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.1" floodColor="#47646b" floodOpacity=".27"/>
      </filter>
    </defs>
    <g filter={`url(#${id}-shadow)`}>{forms[stage] ?? forms[0]}</g>
  </svg>
}
