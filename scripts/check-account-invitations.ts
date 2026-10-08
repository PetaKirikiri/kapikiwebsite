import dotenv from 'dotenv'
import pg from 'pg'
import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
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
let retainedUser: string | null = null
const retainedRegistrations = new Set<string>()
let stage = 'server access'
await db.connect()
try {
  const access = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (access.error) throw new Error('Server access was rejected.')
  const site = env.KA_PIKI_SITE_URL || 'https://kapikiwebsite.vercel.app'
  const page = await fetch(new URL('/account-setup.html', site))
  assert(page.ok && (await page.text()).includes('name="ka-piki-account-setup" content="3"'), 'The setup page must be deployed first.')
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
      await db.query('begin')
      try {
        for (const level of levels) {
          const inserted = await db.query(`insert into public.kp_course_interest(name,email,selected_level,goals)
            values('Account setup check',$1,$2,'Isolated account setup check') returning id`, [email, level])
          interestIds.push(inserted.rows[0].id)
          createdRegistrations.push(inserted.rows[0].id)
        }
        // Signup inserts may enqueue owner notifications. Remove only these test
        // rows before commit, so the scheduled sender can never claim them.
        await db.query('set constraints all immediate')
        await db.query('delete from public.kp_signup_notifications where signup_id=any($1::uuid[])', [interestIds])
        assert.equal((await db.query('select count(*)::int count from public.kp_signup_notifications where signup_id=any($1::uuid[])', [interestIds])).rows[0].count, 0)
        await db.query('commit')
      } catch (error) { await db.query('rollback'); throw error }
      await db.query(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,created_at,expires_at,exchange_count,last_exchange_at)
        values($1,$2,$3,$4,'setup',now()-interval '2 years',null,30,now()-interval '1 day')`, [user.id, email, interestIds, createHash('sha256').update(token).digest('hex')])
      const exchange = (value: string) => exchangeAccountInvitation(value, new URL('/api/account-invitation', site).href)
      stage = `${scenario}: invitation identity and level validation`
      await assert.rejects(exchange(randomBytes(32).toString('hex')))
      const browser = client()
      const details = await loadAccountInvitation(browser, token)
      assert.deepEqual(details.registeredLevels, levels)
      assert.equal(details.email, email)
      assert.equal((await browser.auth.getSession()).data.session, null, 'Opening the link must not consume it or sign in.')
      await assert.rejects(loadAccountInvitation(client(), randomBytes(32).toString('hex')))
      await assert.rejects(saveAccountInvitation(browser, token, { ...details, selectedLevel: 6, departmentGroup: 'QA', password: randomBytes(24).toString('base64url') }))
      const password = randomBytes(24).toString('base64url')
      const values = { ...details, name: 'Verified setup check', selectedLevel: 3, departmentGroup: 'QA', password }
      // Fail only the first completion request, after the real Auth password save.
      // All other operations still use the live disposable account and database.
      let completionAttempts = 0
      const interruptedBrowser = new Proxy(browser, { get(target, property, receiver) {
        if (property !== 'rpc') return Reflect.get(target, property, receiver)
        return (...args: Parameters<typeof browser.rpc>) => {
          if (args[0] === 'kp_complete_account_invitation' && ++completionAttempts === 1) {
            return Promise.resolve({ data: null, error: { message: 'Simulated completion network failure' } })
          }
          if (args[0] === 'kp_complete_account_invitation' && completionAttempts === 2) {
            // Commit for real, then simulate losing the successful HTTP response.
            return Promise.resolve(target.rpc(...args)).then(result => {
              assert(!result.error, 'The real completion must succeed before simulating response loss.')
              return { data: null, error: { message: 'Simulated response lost after commit' } }
            })
          }
          return target.rpc(...args)
        }
      } })
      stage = `${scenario}: first password save with interrupted details request`
      await assert.rejects(saveAccountInvitation(interruptedBrowser, token, values, exchange), /Your password is saved, but your details could not be saved/)
      const partial = await db.query('select completed_at,exchange_count from public.kp_account_invitations where user_id=$1', [user.id])
      assert.equal(partial.rows[0].completed_at, null)
      assert.equal(partial.rows[0].exchange_count, 31, 'Prior exchange attempts must not permanently disable the invitation.')
      stage = `${scenario}: exchange cooldown`
      await db.query('update public.kp_account_invitations set last_exchange_at=now() where user_id=$1', [user.id])
      await assert.rejects(exchange(token), /wait a moment/, 'The short exchange cooldown must still be enforced.')
      // Supabase must reject repeating the saved password with its precise code;
      // the form retry must recognize that and finish the outstanding details.
      const repeatedPassword = await browser.auth.updateUser({ password })
      assert.equal(repeatedPassword.error?.code, 'same_password')
      stage = `${scenario}: same-password partial-save retry`
      await saveAccountInvitation(interruptedBrowser, token, values, exchange)
      assert.equal(completionAttempts, 2)
      stage = `${scenario}: completed-result recovery without overwriting saved values`
      await saveAccountInvitation(interruptedBrowser, token, { ...values, name: 'Must not overwrite', password: randomBytes(24).toString('base64url') }, exchange)
      assert.equal(completionAttempts, 2, 'An already-completed retry must not submit changes again.')
      assert.equal((await browser.auth.getUser()).data.user?.id, user.id)
      const profile = await db.query('select name,selected_level from public.kp_profiles where user_id=$1', [user.id])
      assert.equal(profile.rows[0].selected_level, 3)
      assert.equal(profile.rows[0].name, 'Verified setup check')
      const saved = await db.query('select name,department_group from public.kp_course_interest where id=any($1::uuid[])', [interestIds])
      assert(saved.rows.every(row => row.name === 'Verified setup check' && row.department_group === 'QA'))
      stage = `${scenario}: fresh password sign-in and learning access`
      const freshBrowser = client()
      const login = await freshBrowser.auth.signInWithPassword({ email, password })
      assert(!login.error && login.data.user?.id === user.id, 'The saved password must work for a fresh sign-in.')
      assert.equal(login.data.user.user_metadata.password_setup_complete, true)
      assert.equal(login.data.user.user_metadata.name, 'Verified setup check')
      const signedInProfile = await freshBrowser.from('kp_profiles').select('name,selected_level').eq('user_id', user.id).single()
      assert(!signedInProfile.error && signedInProfile.data.name === 'Verified setup check' && signedInProfile.data.selected_level === 3)
      // Match all four requests used by the actual My learning page, using the
      // freshly signed-in student's permissions rather than admin/SQL access.
      const learning = await Promise.all([
        freshBrowser.from('kp_learning_records').select('*').eq('user_id', user.id).order('occurred_on', { ascending: false, nullsFirst: false }),
        freshBrowser.rpc('kp_my_course_interest'),
        freshBrowser.from('kp_training').select('*').eq('user_id', user.id).order('recorded_on', { ascending: false }),
        freshBrowser.from('kp_assessments').select('*').eq('user_id', user.id).order('assessed_on', { ascending: false }),
      ])
      assert(learning.every(result => !result.error), 'All My learning queries must succeed for the signed-in student.')
      assert(learning[1].data.length === 1 && learning[1].data[0].selected_level === 3)
      assert.equal(learning[0].data!.length, 0, 'A new student must not see another student’s learning records.')
      assert.equal(learning[2].data!.length, 0, 'A new student must not see another student’s training.')
      assert.equal(learning[3].data!.length, 0, 'A new student must not see another student’s assessments.')
      stage = `${scenario}: completed-link rejection`
      await assert.rejects(loadAccountInvitation(client(), token), 'A completed invitation must not be reusable.')
      await assert.rejects(exchange(token), 'Completed invitations must not issue new sign-in tokens.')
      console.log(`PASS: ${scenario}, two-year-old setup link, more than 30 prior attempts, cooldown, partial-save retry, lost-response recovery, private details, level selection, password saved, registration saved, fresh sign-in and one-time link.`)
      if (scenario === 'existing account' && process.argv.includes('--browser-fixture')) {
        await mkdir('.local', { recursive: true, mode: 0o700 })
        await writeFile('.local/account-browser-fixture.json', JSON.stringify({ email, password, userId: user.id, registrationIds: interestIds }), { mode: 0o600, flag: 'wx' })
        retainedUser = user.id
        interestIds.forEach(id => retainedRegistrations.add(id))
      }
    }
  }
} catch {
  console.error(`FAIL: ${stage}. No student emails were sent; test credentials are not logged.`)
  process.exitCode = 1
} finally {
  for (const id of createdUsers) {
    if (id === retainedUser) continue
    const removed = await admin.auth.admin.deleteUser(id)
    if (removed.error) { console.error('A disposable test account needs cleanup.'); process.exitCode = 1 }
  }
  const removableRegistrations = createdRegistrations.filter(id => !retainedRegistrations.has(id))
  if (removableRegistrations.length) await db.query('delete from public.kp_course_interest where id=any($1::uuid[])', [removableRegistrations])
  await db.end()
  if (createdUsers.length && !process.exitCode) console.log(retainedUser
    ? 'One disposable account retained privately for browser verification; all other test fixtures removed. Existing students and emails were untouched.'
    : 'Test accounts and registrations removed. Existing students and emails were untouched.')
}
