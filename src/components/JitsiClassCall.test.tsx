import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import JitsiClassCall, { testCallId } from './JitsiClassCall'
const identity = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('../lib/studentPortal/callIdentity', () => ({ loadCallDisplayName: identity.load }))

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
let options: Record<string, any>
let listeners: Record<string, () => void>
const dispose = vi.fn()
const construct = vi.fn()
beforeEach(() => {
  vi.stubGlobal('React', React)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  window.history.replaceState({}, '', '/#moe/lessons?preview')
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  dispose.mockClear(); construct.mockClear(); listeners = {}
  identity.load.mockReset().mockResolvedValue('Peta Kirikiri')
  window.JitsiMeetExternalAPI = class {
    constructor(domain: string, args: Record<string, unknown>) { construct(domain); options = args }
    dispose = dispose
    addListener(event: string, callback: () => void) { listeners[event] = callback }
  }
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); delete window.JitsiMeetExternalAPI; vi.unstubAllGlobals() })
const click = async (label: string) => act(async () => { const button = [...host.querySelectorAll('button')].find(b => b.textContent === label); expect(button).toBeTruthy(); button!.click() })

it('waits for a camera click then skips prejoin and uses the account display name', async () => {
  await act(async () => root.render(<JitsiClassCall />))
  expect(construct).not.toHaveBeenCalled()
  expect(identity.load).not.toHaveBeenCalled()
  await click('Open cameras & mic')
  expect(construct).toHaveBeenCalledWith('meet.jit.si')
  expect(options.configOverwrite).toMatchObject({ startWithAudioMuted: false, startWithVideoMuted: false, prejoinConfig: { enabled: false } })
  expect(options.userInfo).toEqual({ displayName: 'Peta Kirikiri' })
  expect(options.roomName).toMatch(/^KaPikiTest-[a-f0-9-]{36}$/)
  expect(window.location.hash).toBe('#moe/lessons?preview')
})
it('does not start media when closed while the profile is loading', async () => {
  let resolveName!: (name: string) => void
  identity.load.mockReturnValue(new Promise<string>(resolve => { resolveName = resolve }))
  await act(async () => root.render(<JitsiClassCall />))
  await click('Open cameras & mic')
  await click('Close call')
  await act(async () => resolveName('Peta'))
  expect(construct).not.toHaveBeenCalled()
})
it('reuses a shared test id and rejects an invalid incoming id', () => {
  const id = testCallId()
  expect(testCallId()).toBe(id)
  window.history.replaceState({}, '', '/?call=public-room#classroom')
  expect(testCallId()).not.toBe('public-room')
})
it('uses the same room for class participants and disposes it on close', async () => {
  await act(async () => root.render(<JitsiClassCall roomId="session-123" />))
  await click('Open cameras & mic')
  expect(options.roomName).toBe('KaPikiTest-session-123')
  await act(async () => listeners.videoConferenceJoined())
  expect(host.textContent).toContain('Connected')
  await click('Close call')
  expect(dispose).toHaveBeenCalledTimes(1)
})
it('disposes on unmount and handles hangup', async () => {
  await act(async () => root.render(<JitsiClassCall />))
  await click('Open cameras & mic')
  await act(async () => listeners.readyToClose())
  expect(dispose).toHaveBeenCalledTimes(1)
  await click('Open cameras & mic')
  await act(async () => root.render(null))
  expect(dispose).toHaveBeenCalledTimes(2)
})
it('reports permission errors without claiming success', async () => {
  await act(async () => root.render(<JitsiClassCall />))
  await click('Open cameras & mic')
  await act(async () => listeners.micError())
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Microphone unavailable')
  expect(host.textContent).not.toContain('Connected')
})

it('shows an actionable error if opening the room fails before the embed starts', async () => {
  await act(async () => root.render(<JitsiClassCall />))
  const failure = vi.spyOn(window.history, 'replaceState').mockImplementation(() => { throw new Error('Room link unavailable') })
  try {
    await click('Open cameras & mic')
    expect(host.querySelector('[role=alert]')?.textContent).toContain('Could not open the call: Room link unavailable')
    expect(construct).not.toHaveBeenCalled()
  } finally { failure.mockRestore() }
})

it('opens from a camera tile while keeping the idle call panel hidden', async () => {
  await act(async () => root.render(<JitsiClassCall renderTrigger={open => <button onClick={open}>Peta camera</button>} />))
  expect(host.querySelector('.jitsi-class-call')?.hasAttribute('hidden')).toBe(true)
  expect(construct).not.toHaveBeenCalled()
  await click('Peta camera')
  expect(construct).toHaveBeenCalledTimes(1)
  expect(host.querySelector('.jitsi-class-call')?.hasAttribute('hidden')).toBe(false)
  await click('Close call')
  expect(host.querySelector('.jitsi-class-call')?.hasAttribute('hidden')).toBe(true)
  expect(host.textContent).toContain('Peta camera')
})
