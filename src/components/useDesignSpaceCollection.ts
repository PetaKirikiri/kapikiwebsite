import { useCallback, useEffect, useRef, useState } from 'react'
import { isCompleteProductionCollection, readDesignSpaceCollection, readProductionDesignSpaceCollection, loadDesignSpaceCollection, syncDesignSpaceCollection, type LockedDesign } from './designSpaceCollection'

export function useDesignSpaceCollection(options: Readonly<{ production?: boolean }> = {}) {
  const production = options.production === true
  const [collection, setCollection] = useState(() => production
    ? readProductionDesignSpaceCollection()
    : readDesignSpaceCollection())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestVersion = useRef(0)
  const refreshing = useRef(false)
  const savingRef = useRef(false)
  const refresh = useCallback(async () => {
    if (refreshing.current || savingRef.current) return
    refreshing.current = true
    const version = ++requestVersion.current
    setLoading(true)
    try {
      const saved = await loadDesignSpaceCollection()
      if (version === requestVersion.current) {
        if (!production || isCompleteProductionCollection(saved)) {
          setCollection(saved)
          setError(null)
        } else {
          setError('The shared production shape pack is incomplete; the last complete cache is still in use.')
        }
      }
    } catch (cause) {
      if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : 'Could not load shared shapes.')
    } finally {
      refreshing.current = false
      if (version === requestVersion.current) setLoading(false)
    }
  }, [production])
  useEffect(() => {
    let cancelled = false
    const version = ++requestVersion.current
    void loadDesignSpaceCollection().then((saved) => {
      if (!cancelled && version === requestVersion.current) {
        if (!production || isCompleteProductionCollection(saved)) {
          setCollection(saved)
          setError(null)
        } else {
          setError('The shared production shape pack is incomplete; the last complete cache is still in use.')
        }
      }
    }).catch((cause: unknown) => {
      if (!cancelled && version === requestVersion.current) setError(cause instanceof Error ? cause.message : 'Could not load shared shapes.')
    }).finally(() => {
      if (!cancelled && version === requestVersion.current) setLoading(false)
    })
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus) }
  }, [production, refresh])
  const save = async (shape: LockedDesign) => {
    if (savingRef.current) return false
    savingRef.current = true
    ++requestVersion.current
    setSaving(true)
    setLoading(false)
    try {
      const saved = await syncDesignSpaceCollection([shape])
      setCollection(saved)
      setError(null)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The shape was not saved. Please retry.')
      return false
    } finally { savingRef.current = false; setSaving(false) }
  }
  return { collection, loading, saving, error, refresh, save }
}
