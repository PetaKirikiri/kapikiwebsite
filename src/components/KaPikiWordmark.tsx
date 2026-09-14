import { useMemo } from 'react'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import { compileConnectorLibrary, CONNECTOR_BLUEPRINTS } from '../lib/connectorPresentation/blueprints'
import { effectiveBoundaryPattern, effectivePatternFor, oppositeRole } from '../lib/connectorPresentation/patterns'
import { planConnectorFace, planPatternPiece } from '../lib/connectorPresentation/presentation'
import { WORD_CLASS_VISUAL_PALETTE } from './railVisualPalette'
import SavedConnectorCheckpoint from './SavedConnectorCheckpoint'

/** A display-only TAM + verb wordmark using the same saved faces as the course. */
export default function KaPikiWordmark() {
  const { collection } = useDesignSpaceCollection({ production: true })
  const { rules } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  const plans = useMemo(() => {
    const boundary = effectiveBoundaryPattern('tam', 'particle', 'intransitive_verb', 'verb', rules)
    const verb = effectivePatternFor('intransitive_verb', 'verb', rules)
    const blueprint = CONNECTOR_BLUEPRINTS.find(item => item.id === boundary?.face.blueprintId)
    if (!boundary || !verb || !blueprint) return null
    const join = planConnectorFace(library, blueprint,
      boundary.owner === 'right' ? oppositeRole(boundary.face.role) : boundary.face.role,
      WORD_CLASS_VISUAL_PALETTE.tam, WORD_CLASS_VISUAL_PALETTE.verb)
    const end = planPatternPiece(library, verb.right, 'right', WORD_CLASS_VISUAL_PALETTE.verb)
    return join.status === 'ready' && end.status === 'ready' ? { join, end } : null
  }, [library, rules])
  return <span className="site-wordmark-sentence">
    <span className="site-wordmark-art" aria-hidden="true">
      {plans ? <>
        <span style={{ width: 32, background: WORD_CLASS_VISUAL_PALETTE.tam }} />
        <SavedConnectorCheckpoint plan={plans.join} displayHeight={20} />
        <span style={{ width: 16, background: WORD_CLASS_VISUAL_PALETTE.verb }} />
        <SavedConnectorCheckpoint plan={plans.end} displayHeight={20} />
      </> : null}
    </span>
    <span className="site-wordmark-words"><span>Ka</span>{' '}<span>Piki</span></span>
  </span>
}
