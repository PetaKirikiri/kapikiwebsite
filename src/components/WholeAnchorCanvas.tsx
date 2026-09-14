import { useEffect, useMemo, useRef, useState } from 'react'
import { composeWholeAnchor } from '../lib/connectorPresentation/wholeAnchorGrowth'
import type { ConnectorFacePlan } from '../lib/connectorPresentation/presentation'

export default function WholeAnchorCanvas({ left, right, color, progress, showPlate = false }: {
  left: ConnectorFacePlan; right: ConnectorFacePlan; color: string; progress: number; showPlate?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const compiled = useRef<ReturnType<typeof composeWholeAnchor> | null>(null)
  const [error, setError] = useState('')
  const key = useMemo(() => JSON.stringify([left, right, color]), [left, right, color])
  useEffect(() => {
    try {
      compiled.current = composeWholeAnchor(left, right, color, true)
      setError('plate' in compiled.current && !compiled.current.plate?.continuous
        ? 'Pipe wall leaves a detached pocket — not ready for filling.' : '')
    } catch (cause) {
      compiled.current = null
      setError(cause instanceof Error ? cause.message : 'Anchor unavailable')
    }
    // Plans are immutable; the serialized identity includes every drawing field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => {
    if (!compiled.current || !canvas.current) return
    const plan = compiled.current
    canvas.current.dataset.anchorSeedX=String((plan.seed%plan.width)/3)
    canvas.current.dataset.anchorSeedY=String(Math.floor(plan.seed/plan.width)/3)
    if (canvas.current.width !== plan.width) canvas.current.width = plan.width
    if (canvas.current.height !== plan.height) canvas.current.height = plan.height
    const original = plan.frame(progress)
    const display = new ImageData(new Uint8ClampedArray(original.data), plan.width, plan.height)
    const plate = 'plate' in plan ? plan.plate : undefined
    if (showPlate && plate) {
      const { material, width, height } = plate
      for (let i=0;i<material.length;i++) {
        if (!material[i]) continue
        const x=i%width, y=Math.floor(i/width)
        const edge=x<2||y<2||x>=width-2||y>=height-2||
          !material[i-2]||!material[i+2]||!material[i-2*width]||!material[i+2*width]
        if (edge) display.data.set([28,35,48,255],i*4)
      }
      for (let i=0;i<material.length;i++) {
        const alpha=plate.pipeWalls.data[i*4+3]/255
        if (!alpha) continue
        const oldAlpha=display.data[i*4+3]/255, resultAlpha=alpha+oldAlpha*(1-alpha)
        for(let channel=0;channel<3;channel++) display.data[i*4+channel]=
          (display.data[i*4+channel]*oldAlpha*(1-alpha)+plate.pipeWalls.data[i*4+channel]*alpha)/resultAlpha
        display.data[i*4+3]=resultAlpha*255
      }
    }
    canvas.current.getContext('2d')!.putImageData(display, 0, 0)
  }, [progress, key, showPlate])
  return <>{error ? <span role="alert">{error}</span> : null}
    <canvas ref={canvas} role="img" aria-label={showPlate ? 'Plate boundary and original winding pipe edges' : 'One connected anchor shape'} style={{ width: 130, height: 40, display: 'block' }} />
  </>
}
