import { useConnectorDrawingSymbols } from './ConnectorDrawingSymbols'
import {
  assertLockedPatternDrawing,
  type LockedPatternDrawing,
} from './patternDrawingContract'

export default function PatternDrawer({
  drawing,
  testId,
  drawerTestId,
  ariaLabel,
}: Readonly<{
  drawing: LockedPatternDrawing
  testId: string
  drawerTestId?: string
  ariaLabel: string
}>) {
  const symbols = useConnectorDrawingSymbols()
  const symbol = symbols?.get(drawing.path)
  assertLockedPatternDrawing(drawing)
  return (
    <svg
      data-testid={drawerTestId ?? `${testId}-drawer`}
      data-source-contract-key={drawing.sourceContractKey}
      data-source-version={drawing.sourceVersion}
      data-equation-revision={drawing.equationRevision}
      data-source-locked="true"
      viewBox={drawing.viewBox}
      overflow="hidden"
      className="mx-auto aspect-square w-full max-w-[30rem]"
      role="img"
      aria-label={ariaLabel}
    >
      {symbol ? <use data-testid={testId} href={`#${symbol}`} {...drawing.drawing} />
        : <path data-testid={testId} d={drawing.path} {...drawing.drawing} />}
    </svg>
  )
}
