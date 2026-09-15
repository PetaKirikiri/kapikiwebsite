import BusManifestReviewView, {
  type BusManifestReviewViewProps,
} from './BusManifestReviewView'
import './FamilyConnectorSentenceView.css'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Props = BusManifestReviewViewProps & { readonly displaySize?: 'default' | 'teaching' | 'fit' }

function FittedSentence({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const measure = () => {
      const outer = frame.current, inner = content.current
      if (!outer || !inner || !inner.offsetWidth || !inner.offsetHeight) return
      const next = Math.min(2.4, outer.clientWidth / inner.offsetWidth, outer.clientHeight / inner.offsetHeight)
      if (next > 0) setScale(previous => Math.abs(previous - next) < .005 ? previous : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (frame.current) observer.observe(frame.current)
    if (content.current) observer.observe(content.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={frame} className="connector-sentence-fit"><div ref={content} className="connector-sentence-fit-content" style={{ zoom: scale }}>{children}</div></div>
}

/**
 * The sole learner-facing sentence surface. Website, Sentence Structures, and
 * the Connectors workshop cannot select different connector interpreters.
 */
export default function FamilyConnectorSentenceView({ displaySize = 'default', ...props }: Props) {
  if (displaySize === 'default') return <BusManifestReviewView {...props} />
  if (displaySize === 'fit') return <FittedSentence><BusManifestReviewView {...props} /></FittedSentence>
  return <div className="connector-sentence-teaching"><BusManifestReviewView {...props} /></div>
}
