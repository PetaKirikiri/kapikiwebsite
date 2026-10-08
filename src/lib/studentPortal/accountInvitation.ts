import type { SupabaseClient } from '@supabase/supabase-js'
import type { AccountSetupDetails } from '../../components/studentPortal/AccountSetupForm'

export type AccountInvitation = AccountSetupDetails & { userId: string; tokenType: 'invite' | 'magiclink' | 'setup' }
export const INVALID_SETUP_LINK = 'This link is no longer available. Please ask Peta for a new link.'

export async function loadAccountInvitation(client: SupabaseClient, token: string): Promise<AccountInvitation> {
  if (!/^[a-zA-Z0-9_-]{32,256}$/.test(token)) throw new Error(INVALID_SETUP_LINK)
  const { data, error } = await client.rpc('kp_account_invitation_details', { setup_token: token })
  if (error) throw new Error('We couldn’t open your details. Please try again shortly.')
  if (!data || !['invite', 'magiclink', 'setup'].includes(data.tokenType)) throw new Error(INVALID_SETUP_LINK)
  return data as AccountInvitation
}

export async function exchangeAccountInvitation(token: string, endpoint = '/api/account-invitation'): Promise<{ tokenHash: string; type: 'magiclink' }> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' })
  const data = await response.json()
  if (!response.ok || typeof data.tokenHash !== 'string' || data.type !== 'magiclink') throw new Error(data.error || INVALID_SETUP_LINK)
  return data
}

export async function saveAccountInvitation(client: SupabaseClient, token: string, values: AccountSetupDetails & { password: string }, exchange = exchangeAccountInvitation) {
  // Refresh the server-owned identity/choices immediately before any Auth change.
  const invitation = await loadAccountInvitation(client, token)
  if (!invitation.registeredLevels?.includes(values.selectedLevel)) throw new Error('Please choose one of your registered levels.')
  if (!values.name.trim() || !values.departmentGroup.trim() || values.name.trim().length > 160 || values.departmentGroup.trim().length > 160) throw new Error('Please complete your name and department / group.')
  if (values.password.length < 8) throw new Error('Use at least 8 characters for your password.')

  const current = await client.auth.getUser()
  if (current.data.user?.id !== invitation.userId || current.data.user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    const credential = invitation.tokenType === 'setup' ? await exchange(token) : { tokenHash: token, type: invitation.tokenType }
    const verified = await client.auth.verifyOtp({ token_hash: credential.tokenHash, type: credential.type })
    if (verified.error || !verified.data.user) throw new Error(INVALID_SETUP_LINK)
    if (verified.data.user.id !== invitation.userId || verified.data.user.email?.toLowerCase() !== invitation.email.toLowerCase()) throw new Error('This link does not match your account.')
  }
  // Only Supabase Auth receives the password, never an application record/RPC.
  const updated = await client.auth.updateUser({ password: values.password })
  if (updated.error) throw updated.error
  const saved = await client.rpc('kp_complete_account_invitation', {
    setup_token: token, student_name: values.name.trim(), department_group: values.departmentGroup.trim(), chosen_level: values.selectedLevel,
  })
  if (saved.error) throw new Error('Your password is saved, but your details could not be saved. Please try again.')
  // Refresh the cached user after the database marks onboarding complete.
  await client.auth.refreshSession()
}
