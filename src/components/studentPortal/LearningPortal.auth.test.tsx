import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => ({ getUser: vi.fn(), listener: undefined as undefined | ((event: string, session: unknown) => void) }))
const learning = vi.hoisted(() => vi.fn())
vi.mock('../../lib/studentPortal/client', () => ({ studentClient: { auth: { getUser: auth.getUser, onAuthStateChange: (listener: typeof auth.listener) => {
  auth.listener = listener
  return { data: { subscription: { unsubscribe: vi.fn() } } }
} } } }))
vi.mock('../../lib/studentPortal/learning', () => ({ loadLearning: learning, meetingLink: () => null }))
vi.mock('./StudentWorkspace', () => ({ default: () => null }))
vi.mock('./LearningSignIn', () => ({ default: () => <p>Sign in form</p> }))
vi.mock('./PasswordSetup', () => ({ default: () => <p>Set a password form</p>, needsPasswordSetup: (user: { user_metadata: { password_setup_complete?: boolean } }) => user.user_metadata.password_setup_complete !== true }))
import { AuthenticatedLearningPortal } from './LearningPortal'

const verified = { id: 'learner', email: 'learner@example.com', user_metadata: { password_setup_complete: true } }
const cached = { ...verified, user_metadata: { password_setup_complete: false } }
let host: HTMLDivElement, root: Root
beforeEach(() => {
  vi.stubGlobal('React', React); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  auth.getUser.mockReset(); auth.listener = undefined
  learning.mockReset().mockResolvedValue({ records: [], interests: [], training: [], assessments: [] })
  host = document.createElement('div'); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it('uses fresh onboarding metadata and ignores the cached initial session', async () => {
  let finish!: (result: unknown) => void
  auth.getUser.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  await act(async () => root.render(<AuthenticatedLearningPortal />))
  await act(async () => auth.listener?.('INITIAL_SESSION', { user: cached }))
  expect(host.textContent).toContain('Opening your portal')
  expect(host.textContent).not.toContain('Set a password form')
  await act(async () => finish({ data: { user: verified }, error: null }))
  expect(learning).toHaveBeenCalledWith('learner')
  expect(host.textContent).not.toContain('Set a password form')
})
it('does not restore an account when an older identity request finishes after sign-out', async () => {
  let finish!: (result: unknown) => void
  auth.getUser.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  await act(async () => root.render(<AuthenticatedLearningPortal />))
  await act(async () => auth.listener?.('SIGNED_OUT', null))
  await act(async () => finish({ data: { user: verified }, error: null }))
  expect(host.textContent).toContain('Sign in form')
  expect(learning).not.toHaveBeenCalled()
})
it('verifies newer sign-in events outside the callback before choosing the setup screen', async () => {
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
  await act(async () => root.render(<AuthenticatedLearningPortal />))
  auth.getUser.mockResolvedValue({ data: { user: verified }, error: null })
  await act(async () => {
    auth.listener?.('SIGNED_IN', { user: cached })
    expect(auth.getUser).toHaveBeenCalledTimes(1)
    await new Promise(resolve => setTimeout(resolve, 1))
  })
  expect(auth.getUser).toHaveBeenCalledTimes(2)
  expect(learning).toHaveBeenCalledWith('learner')
  expect(host.textContent).not.toContain('Set a password form')
})
it('keeps a newer verified account when the initial identity request resolves late', async () => {
  let finish!: (result: unknown) => void
  auth.getUser.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    .mockResolvedValue({ data: { user: { ...verified, id: 'newer-learner' } }, error: null })
  await act(async () => root.render(<AuthenticatedLearningPortal />))
  await act(async () => {
    auth.listener?.('SIGNED_IN', { user: { ...cached, id: 'newer-learner' } })
    await new Promise(resolve => setTimeout(resolve, 1))
  })
  await act(async () => finish({ data: { user: verified }, error: null }))
  expect(learning).toHaveBeenCalledExactlyOnceWith('newer-learner')
})
it('ignores verification that finishes after the portal unmounts', async () => {
  let finish!: (result: unknown) => void
  auth.getUser.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  await act(async () => root.render(<AuthenticatedLearningPortal />))
  await act(async () => root.unmount())
  await act(async () => finish({ data: { user: verified }, error: null }))
  expect(learning).not.toHaveBeenCalled()
})
it('shows sign-in recovery if verification fails instead of using stale setup metadata', async () => {
  auth.getUser.mockRejectedValue(new Error('Network unavailable'))
  await act(async () => root.render(<AuthenticatedLearningPortal />))
  expect(host.textContent).toContain('Please sign in again')
  expect(host.textContent).toContain('Sign in form')
  expect(host.textContent).not.toContain('Set a password form')
})
