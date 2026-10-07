import { useId } from 'react'

const colours = {
  lessons: ['#acd4e8', '#92bed6', '#78a6c0'],
  practice: ['#cee3a8', '#b8d38e', '#a0bd75'],
  vocabulary: ['#f5dba9', '#e8c58e', '#d0ac73'],
  structures: ['#b7dcca', '#9ec9b4', '#83b19b'],
} as const

/** Hand-formed pieces: broad rounded masses, never wire outlines or sharp folds. */
export default function ClayIcon({ kind }: { kind: keyof typeof colours }) {
  const id = `clay-${useId().replace(/:/g, '')}`
  const [light, face, edge] = colours[kind]
  const body = `url(#${id}-body)`
  const cream = `url(#${id}-cream)`
  const soft = `url(#${id}-soft)`
  return <svg className="ka-clay-icon" width="38" height="38" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-body`} x1=".15" y1="0" x2=".7" y2="1"><stop stopColor={light}/><stop offset=".4" stopColor={face}/><stop offset="1" stopColor={edge}/></linearGradient>
      <linearGradient id={`${id}-cream`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#fff8e9"/><stop offset=".6" stopColor="#f8efd9"/><stop offset="1" stopColor="#e5d9c4"/></linearGradient>
      <filter id={`${id}-soft`} x="-40%" y="-35%" width="180%" height="190%">
        <feDropShadow dx=".3" dy="1.1" stdDeviation=".65" floodColor="#53646a" floodOpacity=".24"/>
      </filter>
    </defs>
    {kind === 'lessons' && <>
      <path d="M5 13Q5 8 11 9Q19 9 24 13Q30 9 37 9Q43 9 43 14L42 36Q42 40 37 39Q29 38 24 41Q18 38 10 39Q5 39 5 34Z" fill={body} filter={soft}/>
      <path d="M10 10Q17 10 21 14Q23 16 23 20V34Q23 36 20 34Q16 32 10 33Q8 33 8 30V14Q8 10 10 10Z" fill={cream} filter={soft}/>
      <path d="M38 10Q31 10 27 14Q25 16 25 20V34Q25 36 28 34Q32 32 38 33Q40 33 40 30V14Q40 10 38 10Z" fill={cream} filter={soft}/>
      <path d="M24 17V36" stroke={body} strokeWidth="4" strokeLinecap="round" filter={soft}/>
      <g fill="none" stroke="#a2c6d4" strokeWidth="2.8" strokeLinecap="round" filter={soft}><path d="m12 18 6 1.5m-6 5 5 1M30 19.5l6-1.5m-6 7 5-1"/></g>
    </>}
    {kind === 'practice' && <g transform="rotate(38 24 24)">
      <rect x="17" y="7" width="14" height="28" rx="6" fill={body} filter={soft}/>
      <rect x="17" y="5" width="14" height="10" rx="5" fill="#efb9a1" filter={soft}/>
      <rect x="17" y="13" width="14" height="5" rx="2.5" fill={cream} filter={soft}/>
      <path d="M17 32Q24 29 31 32L26 42Q24 45 22 42Z" fill={cream} filter={soft}/>
      <path d="M21 40Q24 38 27 40L25.5 43Q24 45 22.5 43Z" fill="#637c87" filter={soft}/>
    </g>}
    {kind === 'vocabulary' && <>
      <rect x="8" y="6" width="32" height="37" rx="9" fill={body} filter={soft}/>
      <rect x="12" y="8" width="25" height="30" rx="7" fill={cream} filter={soft}/>
      <g fill="#d5ad76" filter={soft}><rect x="17" y="15" width="15" height="4" rx="2"/><rect x="17" y="22" width="15" height="4" rx="2"/><rect x="17" y="29" width="10" height="4" rx="2"/></g>
    </>}
    {kind === 'structures' && <>
      <path d="M14 16V31Q14 35 20 35H30" fill="none" stroke={body} strokeWidth="6" strokeLinecap="round" filter={soft}/>
      <rect x="5" y="5" width="21" height="19" rx="7" fill={body} filter={soft}/>
      <rect x="24" y="26" width="21" height="19" rx="7" fill={body} filter={soft}/>
      <rect x="10" y="10" width="11" height="8" rx="4" fill={cream} filter={soft}/>
      <rect x="29" y="31" width="11" height="8" rx="4" fill={cream} filter={soft}/>
    </>}
  </svg>
}
