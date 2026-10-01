import { createContext, useContext, useId, useMemo, type ReactNode } from 'react'
import { usePublicConnectorShapes } from '../lib/connectorPresentation/publicShapeStore'

const DrawingSymbols = createContext<ReadonlyMap<string, string> | null>(null)
export const useConnectorDrawingSymbols = () => useContext(DrawingSymbols)

/** Define each exact saved path once; each word retains its own fill and stroke. */
export default function ConnectorDrawingSymbols({ children }: { children: ReactNode }) {
  const { collection } = usePublicConnectorShapes()
  const prefix = useId()
  const paths = useMemo(() => new Map(collection.map(shape => [shape.drawing.path, `${prefix}-connector-${shape.id}`])), [collection, prefix])
  return <DrawingSymbols value={paths}>
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>{[...paths].map(([path, id]) => <path key={id} id={id} d={path} />)}</defs>
    </svg>
    {children}
  </DrawingSymbols>
}
