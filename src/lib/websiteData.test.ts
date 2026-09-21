import { afterEach, expect, it, vi } from 'vitest'
import { readWebsiteJson } from './websiteData'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('recovers from a temporary server failure and returns database content', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 500 }))
    .mockResolvedValueOnce(Response.json({ sentences: [{ structureId: 12 }] }))
  vi.stubGlobal('fetch', fetch)
  const result = readWebsiteJson('/course', new AbortController().signal)
  await vi.runAllTimersAsync()
  await expect(result).resolves.toEqual({ sentences: [{ structureId: 12 }] })
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('does not retry a permissions failure', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('', { status: 403 }))
  vi.stubGlobal('fetch', fetch)
  await expect(readWebsiteJson('/course', new AbortController().signal)).rejects.toThrow()
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('stops retries when the page is closed', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  const result = readWebsiteJson('/course', controller.signal)
  const assertion = expect(result).rejects.toThrow()
  await vi.advanceTimersByTimeAsync(0)
  controller.abort()
  await assertion
  await vi.runAllTimersAsync()
  expect(fetch).toHaveBeenCalledTimes(1)
})
