import { useEffect, useSyncExternalStore } from 'react'
import { getPatternSnapshot, refreshConnectorPatterns, subscribePatternSnapshot } from '../lib/connectorPresentation/patternStore'

export function useConnectorPatterns() {
  const state = useSyncExternalStore(subscribePatternSnapshot, getPatternSnapshot, getPatternSnapshot)
  useEffect(() => {
    void refreshConnectorPatterns()
    const refresh = () => { if (document.visibilityState !== 'hidden') void refreshConnectorPatterns() }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 5000)
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])
  return state
}
