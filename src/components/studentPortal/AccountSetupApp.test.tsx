import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import AccountSetupApp from './AccountSetupApp'
import { loadAccountInvitation } from '../../lib/studentPortal/accountInvitation'

vi.mock('../../lib/studentPortal/accountInvitation', () => ({
  loadAccountInvitation: vi.fn(), saveAccountInvitation: vi.fn(), INVALID_SETUP_LINK: 'Link unavailable',
}))
let host: HTMLDivElement, root: Root
const client = {} as SupabaseClient
const details = { name: 'First learner', email: 'first@example.com', userId: 'first', tokenType: 'setup', selectedLevel: 2, registeredLevels: [2], departmentGroup: 'Policy' }
beforeEach(() => {
  vi.stubGlobal('React', React)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.mocked(loadAccountInvitation).mockReset()
  window.history.replaceState(null, '', '/account-setup.html')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function navigate(token: string) {
  await act(async () => {
    window.history.replaceState(null, '', `/account-setup.html#token=${token}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}
it('opens a valid personal link in a tab that previously showed an invalid link', async () => {
  vi.mocked(loadAccountInvitation).mockRejectedValueOnce(new Error('Link unavailable'))
  await act(async () => root.render(<AccountSetupApp client={client} />))
  expect(host.querySelector('[role=alert]')?.textContent).toBe('Link unavailable')
  vi.mocked(loadAccountInvitation).mockResolvedValueOnce(details as never)
  await navigate('a'.repeat(64))
  expect(host.querySelector('#account-setup-heading')!.textContent).toBe('Kia ora First')
  expect(host.querySelector('[role=alert]')).toBeNull()
})
it('clears the old recipient and ignores their delayed response when the link changes', async () => {
  let finishFirst!: (value: never) => void
  vi.mocked(loadAccountInvitation).mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
  await act(async () => root.render(<AccountSetupApp client={client} />))
  vi.mocked(loadAccountInvitation).mockResolvedValueOnce({ ...details, name: 'Second learner', email: 'second@example.com', registeredLevels: [2,3] } as never)
  await navigate('b'.repeat(64))
  await act(async () => finishFirst(details as never))
  expect(host.querySelector('#account-setup-heading')!.textContent).toBe('Kia ora Second')
  expect(host.querySelector('#account-setup-email')).toHaveProperty('value', 'second@example.com')
  expect(host.querySelectorAll('[type=radio]:checked')).toHaveLength(0)
  expect(host.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true)
})
