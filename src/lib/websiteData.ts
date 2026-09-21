/** Retry transient read failures without persisting a second copy of course data. */
export async function readWebsiteJson<T>(url: string, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted()
    let response: Response | undefined
    try {
      response = await fetch(url, { signal })
      if (response.ok) return await response.json() as T
      if (response.status < 500 && response.status !== 429) throw new Error('Content unavailable.')
    } catch (error) {
      if (signal.aborted || (response && response.status < 500 && response.status !== 429) || attempt >= 2) throw error
    }
    if (attempt >= 2) throw new Error('Content unavailable. Please try again.')
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(signal.reason) }
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 500 * (attempt + 1))
      signal.addEventListener('abort', abort, { once: true })
    })
  }
}
