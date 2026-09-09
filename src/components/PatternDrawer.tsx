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
      <path data-testid={testId} d={drawing.path} {...drawing.drawing} />
    </svg>
  )
}
