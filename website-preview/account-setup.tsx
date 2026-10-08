import { createRoot } from 'react-dom/client'
import AccountSetupApp from '../src/components/studentPortal/AccountSetupApp'
import { studentClient } from '../src/lib/studentPortal/client'

// No analytics or third-party scripts on a page containing a setup credential.
// Reading details does not consume the Auth token; only form submission does.
createRoot(document.getElementById('root')!).render(<AccountSetupApp client={studentClient} />)
