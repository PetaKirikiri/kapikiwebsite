import { normaliseWebsiteHash, websiteRoute } from './websiteRoutes'

/** Preserve each history entry independently, including repeat visits to one route. */
export function installWebsiteNavigation(onNavigate: (hash: string) => void) {
  const positions = new Map<string, number>()
  const oldRestoration = history.scrollRestoration
  history.scrollRestoration = 'manual'
  let currentHash = normaliseWebsiteHash(location.hash)
  let currentKey = ''
  let cancelReveal = () => {}
  const savePosition = () => { if (currentKey) positions.set(currentKey, window.scrollY) }
  const navigate = (explicitTarget = false, initialLoad = false) => {
    cancelReveal()
    const hash = normaliseWebsiteHash(location.hash)
    const entry = history.state?.kaPikiNavigation as { key: string; hash: string } | undefined
    const restored = !explicitTarget && entry?.hash === hash && positions.has(entry.key)
    const y = restored ? positions.get(entry!.key)! : null
    const previous = websiteRoute(currentHash)
    const next = websiteRoute(hash)
    const sameLevel = previous.level != null && previous.path === next.path
    currentKey = restored ? entry!.key : crypto.randomUUID()
    history.replaceState({ ...history.state, kaPikiNavigation: { key: currentKey, hash } }, '', hash)
    currentHash = hash
    onNavigate(hash)
    let stopped = false
    let frame = 0
    let resize: ResizeObserver | undefined
    let mutations: MutationObserver | undefined
    let timer = 0
    const stop = () => {
      stopped = true; cancelAnimationFrame(frame); resize?.disconnect(); mutations?.disconnect(); clearTimeout(timer)
      window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); window.removeEventListener('keydown', stop)
    }
    cancelReveal = stop
    const reveal = () => {
      if (stopped) return
      if (y !== null) {
        window.scrollTo({ top: y, behavior: 'instant' })
        if (document.documentElement.scrollHeight - innerHeight >= y) stop()
        return
      }
      if (next.target) {
        const target = document.getElementById(next.target)
        if (!target) return
        if (!target.hasAttribute('tabindex')) target.tabIndex = -1
        target.focus({ preventScroll: true })
        target.scrollIntoView({ block: 'start', behavior: 'instant' })
        stop(); return
      }
      // Tabs and pattern pagination keep their controls in place.
      if (!sameLevel) {
        window.scrollTo({ top: 0, behavior: 'instant' })
        const heading = document.querySelector<HTMLElement>('main h1')
        // Initial document loads already have a natural reading order. Focus the
        // heading only when navigating within the app, not when opening the site.
        if (heading && !initialLoad) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
      }
      stop()
    }
    frame = requestAnimationFrame(() => {
      reveal()
      if (!stopped) {
        resize = new ResizeObserver(reveal); resize.observe(document.body)
        mutations = new MutationObserver(reveal); mutations.observe(document.body, { childList: true, subtree: true })
        window.addEventListener('wheel', stop, { passive: true }); window.addEventListener('touchstart', stop, { passive: true }); window.addEventListener('keydown', stop)
        timer = window.setTimeout(stop, 5000)
      }
    })
  }
  const handleHashChange = () => navigate()
  const repeatTarget = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a') : null
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return
    const url = new URL(anchor.href)
    if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash === location.hash && websiteRoute(url.hash).target) {
      event.preventDefault(); navigate(true)
    }
  }
  navigate(false, true)
  document.addEventListener('click', repeatTarget)
  window.addEventListener('scroll', savePosition, { passive: true })
  window.addEventListener('hashchange', handleHashChange)
  return () => { cancelReveal(); window.removeEventListener('scroll', savePosition); window.removeEventListener('hashchange', handleHashChange); document.removeEventListener('click', repeatTarget); history.scrollRestoration = oldRestoration }
}
