import dotenv from 'dotenv'
import pg from 'pg'
import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { wordsDatabaseConnection } from '../words-database.mjs'
import { exchangeAccountInvitation, loadAccountInvitation, saveAccountInvitation } from '../src/lib/studentPortal/accountInvitation'

dotenv.config({ path: '.env', quiet: true })
dotenv.config({ path: '.env.local', override: true, quiet: true })
const env = process.env
const url = env.WORDS_SUPABASE_URL
const key = env.STUDENT_SUPABASE_SECRET_KEY
const publicKey = env.WORDS_SUPABASE_ANON_KEY
if (!url || !publicKey || !key) throw new Error('The existing Supabase server credential must be connected before the live account check can run.')
if (env.VITE_STUDENT_SUPABASE_URL && env.VITE_STUDENT_SUPABASE_URL !== url) throw new Error('Account and registration projects do not match.')
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const admin = createClient(url, key, options)
const client = () => createClient(url, publicKey, options)
const db = new pg.Client(wordsDatabaseConnection())
const createdUsers: string[] = []
const createdRegistrations: string[] = []
let stage = 'server access'
await db.connect()
try {
  const access = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (access.error) throw new Error('Server access was rejected.')
  const site = env.KA_PIKI_SITE_URL || 'https://kapikiwebsite.vercel.app'
  const page = await fetch(new URL('/account-setup.html', site))
  assert(page.ok && (await page.text()).includes('name="ka-piki-account-setup" content="2"'), 'The setup page must be deployed first.')
  if (!process.argv.includes('--run')) {
    console.log('PASS: existing Supabase administrator access and deployed setup page. Use --run to test disposable accounts; no student emails are sent.')
  } else {
    for (const scenario of ['new account', 'existing account'] as const) {
      stage = scenario
      const email = `kapiki-setup-check-${randomUUID()}@example.com`
      const levels = scenario === 'new account' ? [3] : [2, 3]
      const created = await admin.auth.admin.createUser({ email,
        ...(scenario === 'existing account' ? { password: randomBytes(24).toString('base64url'), email_confirm: true } : { email_confirm: false }) })
      if (created.error || !created.data.user) throw new Error('Could not create the isolated test account.')
      const user = created.data.user
      createdUsers.push(user.id)
      assert.equal(user.email, email)
      const token = randomBytes(32).toString('hex')
      assert(token)
      const interestIds: string[] = []
      for (const level of levels) {
        const inserted = await db.query(`insert into public.kp_course_interest(name,email,selected_level,goals)
          values('Account setup check',$1,$2,'Isolated account setup check') returning id`, [email, level])
        interestIds.push(inserted.rows[0].id)
        createdRegistrations.push(inserted.rows[0].id)
      }
      await db.query(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,created_at,expires_at)
        values($1,$2,$3,$4,'setup',now()-interval '2 days',now()+interval '12 days')`, [user.id, email, interestIds, createHash('sha256').update(token).digest('hex')])
      const exchange = (value: string) => exchangeAccountInvitation(value, new URL('/api/account-invitation', site).href)
      await assert.rejects(exchange(randomBytes(32).toString('hex')))
      const browser = client()
      const details = await loadAccountInvitation(browser, token)
      assert.deepEqual(details.registeredLevels, levels)
      assert.equal(details.email, email)
      assert.equal((await browser.auth.getSession()).data.session, null, 'Opening the link must not consume it or sign in.')
      await assert.rejects(loadAccountInvitation(client(), randomBytes(32).toString('hex')))
      await assert.rejects(saveAccountInvitation(browser, token, { ...details, selectedLevel: 6, departmentGroup: 'QA', password: randomBytes(24).toString('base64url') }))
      const password = randomBytes(24).toString('base64url')
      await saveAccountInvitation(browser, token, { ...details, name: 'Verified setup check', selectedLevel: 3, departmentGroup: 'QA', password }, exchange)
      assert.equal((await browser.auth.getUser()).data.user?.id, user.id)
      const profile = await db.query('select name,selected_level from public.kp_profiles where user_id=$1', [user.id])
      assert.equal(profile.rows[0].selected_level, 3)
      assert.equal(profile.rows[0].name, 'Verified setup check')
      const saved = await db.query('select name,department_group from public.kp_course_interest where id=any($1::uuid[])', [interestIds])
      assert(saved.rows.every(row => row.name === 'Verified setup check' && row.department_group === 'QA'))
      const learning = await browser.rpc('kp_my_course_interest')
      assert(!learning.error && learning.data.length === 1 && learning.data[0].selected_level === 3)
      const login = await client().auth.signInWithPassword({ email, password })
      assert(!login.error && login.data.user?.id === user.id, 'The saved password must work for a fresh sign-in.')
      assert.equal(login.data.user.user_metadata.password_setup_complete, true)
      await assert.rejects(loadAccountInvitation(client(), token), 'A completed invitation must not be reusable.')
      await assert.rejects(exchange(token), 'Completed invitations must not issue new sign-in tokens.')
      console.log(`PASS: ${scenario}, two-day-old setup link, private details, level selection, password saved, registration saved, fresh sign-in and one-time link.`)
    }
  }
} catch {
  console.error(`FAIL: ${stage}. No student emails were sent; test credentials are not logged.`)
  process.exitCode = 1
} finally {
  for (const id of createdUsers) {
    const removed = await admin.auth.admin.deleteUser(id)
    if (removed.error) { console.error('A disposable test account needs cleanup.'); process.exitCode = 1 }
  }
  if (createdRegistrations.length) await db.query('delete from public.kp_course_interest where id=any($1::uuid[])', [createdRegistrations])
  await db.end()
  if (createdUsers.length && !process.exitCode) console.log('Test accounts and registrations removed. Existing students and emails were untouched.')
}
