import { createRoot } from 'react-dom/client'
import AccountInvitationPage from '../src/components/studentPortal/AccountInvitationPage'
import { studentClient } from '../src/lib/studentPortal/client'

// No analytics or third-party scripts on a page containing a setup credential.
// Reading details does not consume the Auth token; only form submission does.
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''
createRoot(document.getElementById('root')!).render(<AccountInvitationPage client={studentClient} token={token} />)
