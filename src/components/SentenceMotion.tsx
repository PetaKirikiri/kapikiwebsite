import { useLayoutEffect, useRef, type ReactNode } from 'react'

// Display-only correspondence. These identities never tag words or choose faces.
function identities(words: string[]) {
  const counts = new Map<string, number>()
  return words.map((word, index) => {
    const tail = words.slice(index, index + 3).join(' ').toLowerCase()
    const bird = /^(te manu|manu|whero|kākāriki)/.test(tail)
      ? words.slice(index, index + 3).find(w => /^(whero|kākāriki)$/i.test(w)) : undefined
    const base = bird ? `${bird}:${word.toLowerCase()}` : word.toLowerCase()
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    return `${base}:${count}`
  })
}

export default function SentenceMotion({ children, sentence }: { children: ReactNode; sentence: string }) {
  const host = useRef<HTMLDivElement>(null)
  const previous = useRef(new Map<string, { x: number; y: number }>())
  useLayoutEffect(() => {
    const root = host.current
    if (!root) return
    const animations: Animation[] = []
    const frame = requestAnimationFrame(() => {
      const tokens = Array.from(root.querySelectorAll<HTMLElement>('[data-testid^="token-0-"]'))
      const keys = identities(tokens.map(token => token.querySelector('[data-word-text]')?.textContent?.trim() ?? ''))
      const origin = root.getBoundingClientRect()
      const next = new Map<string, { x: number; y: number }>()
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      tokens.forEach((token, index) => {
        const box = token.getBoundingClientRect()
        const point = { x: box.left - origin.left, y: box.top - origin.top }
        const before = previous.current.get(keys[index])
        next.set(keys[index], point)
        if (reduced || previous.current.size === 0) return
        animations.push(token.animate(before ? [
          { transform: `translate(${before.x - point.x}px, ${before.y - point.y}px)` },
          { transform: 'translate(0, 0)' },
        ] : [{ opacity: 0 }, { opacity: 1 }], {
          duration: before ? 1100 : 650,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
        }))
      })
      previous.current = next
    })
    return () => { cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()) }
  }, [sentence, children])
  return <div ref={host} className="splash-maori">{children}</div>
}
