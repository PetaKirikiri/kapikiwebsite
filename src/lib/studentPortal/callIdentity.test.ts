import { beforeEach, expect, it, vi } from 'vitest'
import { loadCallDisplayName } from './callIdentity'

const db = vi.hoisted(() => ({ getSession: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn(), maybeSingle: vi.fn() }))
vi.mock('./client', () => ({ studentClient: { auth: { getSession: db.getSession }, from: db.from } }))
beforeEach(() => {
  vi.resetAllMocks()
  db.getSession.mockResolvedValue({ data: { session: { user: { id: 'signed-in-id', email: 'private@example.com', user_metadata: { name: 'Account name' } } } } })
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db); db.abortSignal.mockReturnValue(db)
  db.maybeSingle.mockResolvedValue({ data: { name: ' Profile name ' }, error: null })
})
it('uses the saved profile name and only queries the signed-in profile', async () => {
  expect(await loadCallDisplayName()).toBe('Profile name')
  expect(db.from).toHaveBeenCalledWith('kp_profiles')
  expect(db.select).toHaveBeenCalledWith('name')
  expect(db.eq).toHaveBeenCalledWith('user_id', 'signed-in-id')
})
it('uses account metadata when the profile is unavailable', async () => {
  db.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Unavailable' } })
  expect(await loadCallDisplayName()).toBe('Account name')
})
it('does not expose email when no name is saved', async () => {
  db.getSession.mockResolvedValue({ data: { session: { user: { id: 'signed-in-id', email: 'private@example.com', user_metadata: {} } } } })
  db.maybeSingle.mockResolvedValue({ data: { name: ' ' }, error: null })
  expect(await loadCallDisplayName()).toBe('Learner')
})
it('handles signed-out users without requesting a profile', async () => {
  db.getSession.mockResolvedValue({ data: { session: null } })
  expect(await loadCallDisplayName()).toBe('Learner')
  expect(db.from).not.toHaveBeenCalled()
})
it('falls back if the profile request throws', async () => {
  db.maybeSingle.mockRejectedValue(new Error('Offline'))
  expect(await loadCallDisplayName()).toBe('Account name')
})
