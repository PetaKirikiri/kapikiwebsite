import type { CSSProperties } from 'react'
import { translatedSegments } from '../lib/connectorPresentation/translation'

/** Shared English alignment: colours and joins come from the rendered Māori. */
export default function SentenceTranslation({ plain = false, text, materials = [], joins = [], fallback = 'Translation not yet available.', className = 'site-translation' }: {
  plain?: boolean
  text: string
  materials?: readonly (string | undefined)[]
  joins?: readonly boolean[]
  fallback?: string
  className?: string
}) {
  const segments = translatedSegments(text, materials, joins)
  return <div className={className} lang="en" aria-label="English translation">
    {plain && segments ? segments.map(segment => segment.text).join(' ') : segments ? segments.map((segment, part) => <span key={part}>
      {part > 0 && !segment.connectedBefore ? ' ' : null}<span title={segment.sourceText ? `Matches: ${segment.sourceText}` : undefined}>
        {segment.parts.map((piece, pieceIndex) => <span key={pieceIndex} className={piece.color ? 'site-translation-match' : undefined}
          style={piece.color ? { '--translation-color': piece.color } as CSSProperties : undefined}>{pieceIndex === 0 && segment.connectedBefore ? ' ' : null}{piece.text}</span>)}
      </span>
    </span>) : <span>{fallback}</span>}
  </div>
}
