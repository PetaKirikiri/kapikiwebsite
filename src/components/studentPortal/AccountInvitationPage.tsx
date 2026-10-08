import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import AccountSetupForm from './AccountSetupForm'
import { loadAccountInvitation, saveAccountInvitation, type AccountInvitation, INVALID_SETUP_LINK } from '../../lib/studentPortal/accountInvitation'

export default function AccountInvitationPage({ client, token }: { client: SupabaseClient | null; token: string }) {
  const [invitation, setInvitation] = useState<AccountInvitation | null>(null)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  useEffect(() => {
    let active = true
    if (!client) { setError('Account setup is unavailable. Please try again shortly.'); return }
    void loadAccountInvitation(client, token).then(value => { if (active) setInvitation(value) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : INVALID_SETUP_LINK) })
    return () => { active = false }
  }, [client, token])

  if (invitation && client && !complete) return <AccountSetupForm details={invitation} onSave={async values => {
    await saveAccountInvitation(client, token, values)
    window.history.replaceState(null, '', window.location.pathname)
    setComplete(true)
  }} />
  return <main className="account-setup-page">
    <div className="account-setup-brand">KA PIKI</div>
    <section className="account-setup-card site-card">
      <header className="site-card-cover account-setup-heading"><h1>{complete ? 'You’re all set' : error ? 'Account setup' : 'Opening your details…'}</h1></header>
      <div className="account-setup-form">
        {error ? <p role="alert">{error}</p> : complete ? <><p>Your details and password are saved.</p><a href="/#moe/my-learning">Go to my learning</a></> : <p role="status">Loading…</p>}
      </div>
    </section>
  </main>
}
