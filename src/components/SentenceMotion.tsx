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
  const previous = useRef(new Map<string, { x: number; y: number; width: number; node: HTMLElement; paint: string }>())
  useLayoutEffect(() => {
    const root = host.current
    if (!root) return
    const animations: Animation[] = []
    const ghosts: HTMLElement[] = []
    const frame = requestAnimationFrame(() => {
      const tokens = Array.from(root.querySelectorAll<HTMLElement>('[data-testid^="token-0-"]'))
      const keys = identities(tokens.map(token => token.querySelector('[data-word-text]')?.textContent?.trim() ?? ''))
      const origin = root.getBoundingClientRect()
      const next = new Map<string, { x: number; y: number; width: number; node: HTMLElement; paint: string }>()
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      const first = previous.current.size === 0
      const anchors = tokens.map((token, index) => ({ token, index,
        word: token.querySelector('[data-word-text]')?.textContent?.trim().toLowerCase(),
      })).filter(({ word }) => word === 'manu' || word === 'whai' || word === 'whaia')
      const centers = anchors.map(({ token }) => {
        const box = token.getBoundingClientRect()
        return box.left + box.width / 2
      })
      tokens.forEach((token, index) => {
        const box = token.getBoundingClientRect()
        const paint = Array.from(token.querySelectorAll('[data-testid^="word-material"], [data-checkpoint-connector-design-id]'))
          .map(element => `${element.getAttribute('style')}:${element.getAttribute('data-checkpoint-connector-design-id')}`).join('|')
        const point = { x: box.left - origin.left, y: box.top - origin.top, width: box.width, node: token.cloneNode(true) as HTMLElement, paint }
        const before = previous.current.get(keys[index])
        next.set(keys[index], point)
        if (reduced) return
        const anchorIndex = anchors.findIndex(anchor => anchor.index === index)
        const anchor = anchorIndex >= 0
        const startX = before?.x ?? (anchor ? origin.width * (anchorIndex + 1) / (anchors.length + 1) - box.width / 2 : point.x)
        if (before || anchor) animations.push(token.animate([
          { transform: `translate(${startX - point.x}px, ${(before?.y ?? point.y) - point.y}px)` },
          { transform: 'translate(0, 0)' },
        ], {
          duration: 1200,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
        }))
        // Each anchor stays readable while its approved artwork opens from its
        // centre. Surrounding pieces follow by distance, not sentence order.
        const distance = centers.length ? Math.min(...centers.map(center => Math.abs(center - (box.left + box.width / 2)))) : 0
        const delay = 1200 + Math.min(distance * 1.5, 420)
        if (anchor) {
          Array.from(token.children).forEach(child => {
            if (!(child instanceof HTMLElement) || child.hasAttribute('data-word-text')) return
            const childBox = child.getBoundingClientRect()
            const growthCenter = box.left + box.width / 2 - childBox.left
            animations.push(child.animate([
              { clipPath: `inset(-32px ${childBox.width - growthCenter}px -12px ${growthCenter}px)` },
              { clipPath: 'inset(-32px -32px -12px -32px)' },
            ], { duration: 900, delay: 1200, fill: 'backwards', easing: 'cubic-bezier(.25,.65,.25,1)' }))
          })
        } else if (first || !before || before.paint !== paint) animations.push(token.animate([
          { clipPath: 'inset(-32px 50% -12px 50%)', opacity: 0 },
          { clipPath: 'inset(-32px -32px -12px -32px)', opacity: 1 },
        ], { duration: 850, delay, fill: 'backwards', easing: 'cubic-bezier(.25,.65,.25,1)' }))
      })
      if (!reduced) previous.current.forEach((old, key) => {
        if (next.has(key)) return
        const ghost = old.node
        ghost.setAttribute('aria-hidden', 'true')
        ghost.inert = true
        // Outgoing artwork is a temporary, noninteractive copy of the engine render.
        ghost.querySelectorAll('[data-testid]').forEach(element => element.removeAttribute('data-testid'))
        ghost.removeAttribute('data-testid')
        Object.assign(ghost.style, { position: 'absolute', left: `${old.x}px`, top: `${old.y}px`, width: `${old.width}px`, pointerEvents: 'none', zIndex: '4' })
        root.appendChild(ghost)
        ghosts.push(ghost)
        const exit = ghost.animate([
          { clipPath: 'inset(-32px -32px -12px -32px)', opacity: .85 },
          { clipPath: 'inset(-32px 100% -12px -32px)', opacity: 0 },
        ], { duration: 420, easing: 'ease-in', fill: 'forwards' })
        exit.onfinish = () => ghost.remove()
        animations.push(exit)
      })
      previous.current = next
    })
    return () => { cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()); ghosts.forEach(ghost => ghost.remove()) }
  }, [sentence, children])
  return <div ref={host} className="splash-maori" style={{ position: 'relative' }}>{children}</div>
}
