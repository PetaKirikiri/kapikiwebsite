import dotenv from 'dotenv'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { wordsDatabaseConnection } from '../words-database.mjs'
import { accountInvitationEmail } from '../src/lib/studentPortal/accountInvitationEmail'

dotenv.config({ path: '.env', quiet: true })
dotenv.config({ path: '.env.local', override: true, quiet: true })
const env = process.env
if (env.VITE_STUDENT_SUPABASE_URL && env.VITE_STUDENT_SUPABASE_URL !== env.WORDS_SUPABASE_URL) throw new Error('Student Auth and registration databases do not match.')
const db = new pg.Client(wordsDatabaseConnection())
await db.connect()
try {
  const { rows } = await db.query(`select id,name,lower(btrim(email)) email,selected_level,department_group,created_at
    from public.kp_course_interest where goals like 'MOE ·%' and goals ~ 'Starts [0-9]+ October 2026' and removed_at is null
    order by created_at desc,id desc`)
  const audience = new Map<string, { name: string; email: string; levels: number[]; ids: string[] }>()
  for (const row of rows) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) throw new Error('A registration has an invalid email. Resolve it before preparing links.')
    let person = audience.get(row.email)
    if (!person) { person = { name: row.name, email: row.email, levels: [], ids: [] }; audience.set(row.email, person) }
    person.ids.push(row.id)
    if (!person.levels.includes(row.selected_level)) person.levels.push(row.selected_level)
  }
  console.log(`Audience checked: ${audience.size} individual recipients; ${[...audience.values()].filter(p => p.levels.length > 1).length} need to choose a level.`)
  if (process.argv.includes('--review')) {
    if (process.argv.includes('--prepare')) throw new Error('Choose either --review or --prepare, not both.')
    const directory = `.local/account-invitations/review-${new Date().toISOString().replace(/[:.]/g, '-')}`
    await mkdir(directory, { recursive: true, mode: 0o700 })
    for (const person of audience.values()) {
      const mail = accountInvitationEmail(person.name, person.levels, 'https://kapikiwebsite.vercel.app/account-setup.html#token=PREVIEW_ONLY')
      await writeFile(`${directory}/${person.ids[0]}.json`, JSON.stringify({ to: person.email, ...mail, previewOnly: true, sent: false }, null, 2), { mode: 0o600, flag: 'wx' })
    }
    console.log(`Prepared ${audience.size} personal email previews in ${directory}. Preview links cannot sign anyone in. No accounts or emails created.`)
  } else if (!process.argv.includes('--prepare')) {
    console.log('Audit only. No accounts, links or emails created. Use --prepare to create individual, unsent drafts.')
  } else {
    if (!env.STUDENT_SUPABASE_SECRET_KEY) throw new Error('STUDENT_SUPABASE_SECRET_KEY is missing. No links or accounts were created.')
    const site = new URL(env.KA_PIKI_SITE_URL || 'https://kapikiwebsite.vercel.app')
    if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash) throw new Error('KA_PIKI_SITE_URL must be the HTTPS site origin.')
    const landing = new URL('/account-setup.html', site)
    const response = await fetch(landing)
    if (!response.ok || !(await response.text()).includes('name="ka-piki-account-setup" content="2"')) throw new Error('The live account setup page is not deployed. No links or accounts were created.')
    const endpoint = await fetch(new URL('/api/account-invitation', site), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: randomBytes(32).toString('hex') }) })
    if (endpoint.status !== 400 || (await endpoint.json()).error !== 'This setup link is invalid or expired.') throw new Error('The live invitation service is not ready. No links or accounts were created.')
    await db.query('select id,exchange_count from public.kp_account_invitations limit 0')
    const admin = createClient(env.WORDS_SUPABASE_URL!, env.STUDENT_SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const access = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (access.error) throw new Error('The Supabase secret key could not access this project. No links or accounts were created.')
    const directory = `.local/account-invitations/${new Date().toISOString().replace(/[:.]/g, '-')}`
    await mkdir(directory, { recursive: true, mode: 0o700 })
    let count = 0
    for (const person of audience.values()) {
      const existing = (await db.query('select id from auth.users where lower(btrim(email))=$1', [person.email])).rows[0]
      const created = new Date()
      const expires = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000)
      let user = existing
      if (!user) {
        // Create an unconfirmed account in the existing Auth project. No email.
        const generated = await admin.auth.admin.createUser({ email: person.email, email_confirm: false })
        if (generated.error || generated.data.user?.email?.toLowerCase() !== person.email) throw new Error(`Account preparation failed for recipient ${count + 1}. Earlier drafts remain unsent.`)
        user = generated.data.user
      }
      const token = randomBytes(32).toString('hex')
      const digest = createHash('sha256').update(token).digest('hex')
      const setupUrl = `${landing.href}#token=${encodeURIComponent(token)}`
      const mail = accountInvitationEmail(person.name, person.levels, setupUrl)
      await db.query('begin')
      let draftPath: string | undefined
      try {
        const active = await db.query('select id,selected_level from public.kp_course_interest where id=any($1::uuid[]) and lower(btrim(email))=$2 and removed_at is null for share', [person.ids, person.email])
        if (active.rows.length !== person.ids.length || active.rows.some(row => !person.levels.includes(row.selected_level))) throw new Error('Registrations changed during preparation. Please run preparation again.')
        await db.query('update public.kp_account_invitations set revoked_at=now() where user_id=$1 and completed_at is null and revoked_at is null', [user.id])
        const result = await db.query(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,created_at,expires_at)
          values($1,$2,$3,$4,$5,$6,$7) returning id`, [user.id,person.email,person.ids,digest,'setup',created,expires])
        const id = result.rows[0].id
        // Exactly one recipient, no CC/BCC, no mailing-list/shared link.
        draftPath = `${directory}/${id}.json`
        await writeFile(draftPath, JSON.stringify({ invitationId:id, to:person.email, ...mail, expiresAt:expires.toISOString(), sent:false }, null, 2), { mode:0o600, flag:'wx' })
        await db.query('commit')
      } catch (error) { await db.query('rollback'); if (draftPath) await unlink(draftPath).catch(() => {}); throw error }
      count++
    }
    console.log(`Prepared ${count} separate drafts in ${directory}. Nothing sent. Each private link is valid for 14 days and closes when setup is completed. Recheck expiry before sending.`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invitation preparation failed.')
  process.exitCode = 1
} finally { await db.end() }
