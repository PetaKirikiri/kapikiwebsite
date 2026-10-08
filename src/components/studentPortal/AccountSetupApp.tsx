import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import AccountInvitationPage from './AccountInvitationPage'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  window.addEventListener('popstate', callback)
  return () => {
    window.removeEventListener('hashchange', callback)
    window.removeEventListener('popstate', callback)
  }
}
const currentToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''

export default function AccountSetupApp({ client }: { client: SupabaseClient | null }) {
  const token = useSyncExternalStore(subscribe, currentToken, () => '')
  // A different personal link must discard the previous recipient's form/state.
  return <AccountInvitationPage key={token} client={client} token={token} />
}
