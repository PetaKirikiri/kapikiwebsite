import { createClient } from '@supabase/supabase-js'
import { interestQuery } from '../interest-api.mjs'
import { deliverSetupNotification } from '../account-setup-mail.mjs'
import { createSetupNotificationHandler } from '../account-setup-notification-api.mjs'
let handler
export default async function route(req, res) {
  if (!handler) {
    const client = createClient(process.env.WORDS_SUPABASE_URL, process.env.STUDENT_SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    handler = createSetupNotificationHandler({ query: interestQuery, deliver: deliverSetupNotification,
      verifyUser: async token => { const { data, error } = await client.auth.getUser(token); return error ? null : data.user },
    })
  }
  return handler(req, res)
}
