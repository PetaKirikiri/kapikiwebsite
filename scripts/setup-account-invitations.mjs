import dotenv from 'dotenv'
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { wordsDatabaseConnection } from '../words-database.mjs'

dotenv.config({ path: '.env', quiet: true })
dotenv.config({ path: '.env.local', override: true, quiet: true })
if (process.env.VITE_STUDENT_SUPABASE_URL && process.env.VITE_STUDENT_SUPABASE_URL !== process.env.WORDS_SUPABASE_URL) throw new Error('Student Auth and registration databases do not match.')
const db = new pg.Client(wordsDatabaseConnection())
const schema = ['007_account_invitations.sql','008_account_setup_link_lifetime.sql','009_account_setup_no_deadline.sql','010_account_setup_completion_recovery.sql'].map(file => readFileSync(new URL(`../supabase/student-portal/${file}`, import.meta.url), 'utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'')).join('\n')
const learner=randomUUID(), other=randomUUID(), email=`${learner}@example.invalid`
const token=randomBytes(32).toString('hex'), otherToken=randomBytes(32).toString('hex'), expiredToken=randomBytes(32).toString('hex')
const digest = value => createHash('sha256').update(value).digest('hex')
async function denied(query, values) {
  await db.query('savepoint denied_operation')
  let failed=false
  try { await db.query(query,values) } catch { failed=true; await db.query('rollback to savepoint denied_operation') }
  await db.query('release savepoint denied_operation')
  assert(failed,'An unauthorised or invalid operation was accepted')
}
async function details(value) { return (await db.query('select public.kp_account_invitation_details($1) details',[value])).rows[0].details }
async function completed(value) { return (await db.query('select public.kp_account_invitation_completed($1) completed',[value])).rows[0].completed }
await db.connect()
try {
  await db.query('begin')
  await db.query("set local lock_timeout='5s'; set local statement_timeout='15s'")
  await db.query(schema)
  await db.query("insert into auth.users(id,email,encrypted_password) values($1,$2,'database-fixture-only'),($3,$4,'database-fixture-only')",[learner,email,other,`${other}@example.invalid`])
  const interests=(await db.query(`insert into public.kp_course_interest(name,email,selected_level,goals,department_group)
    values('Test learner',$1,2,'MOE · test',null),('Test learner',$1,3,'MOE · test','Policy'),('Other learner',$2,1,'MOE · test','Other') returning id,selected_level`,[email,`${other}@example.invalid`])).rows
  const ids=interests.filter(i=>i.selected_level!==1).map(i=>i.id)
  const removed=(await db.query(`insert into public.kp_course_interest(name,email,selected_level,goals,removed_at)
    values('Removed registration',$1,4,'MOE · test',now()) returning id`,[email])).rows[0].id
  ids.push(removed)
  const chosen=interests.find(i=>i.selected_level===3).id
  await db.query(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,expires_at)
    values($1,$2,$3,$4,'setup',null),($1,$2,$3,$5,'setup',null)`,[learner,email,ids,digest(token),digest(otherToken)])
  await db.query(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,created_at,expires_at)
    values($1,$2,$3,$4,'invite',now()-interval '2 hours',now()-interval '1 hour')`,[learner,email,ids,digest(expiredToken)])

  await denied(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,expires_at) values($1,$2,$3,$4,'setup',now()+interval '15 days')`,[learner,email,ids,digest(randomBytes(32).toString('hex'))])
  await denied(`insert into public.kp_account_invitations(user_id,email,interest_ids,token_digest,token_type,expires_at) values($1,$2,$3,$4,'invite',now()+interval '2 hours')`,[learner,email,ids,digest(randomBytes(32).toString('hex'))])
  await db.query('set local role anon')
  assert.equal(await details('invalid'),null)
  assert.equal(await details(randomBytes(32).toString('hex')),null)
  assert.equal(await details(expiredToken),null)
  const preview=await details(token)
  assert.equal(preview.email,email)
  assert.equal(preview.tokenType,'setup')
  assert.deepEqual(preview.registeredLevels,[2,3])
  assert.equal(preview.departmentGroup,'Policy')
  assert(!JSON.stringify(preview).includes('password'))
  await denied('select * from public.kp_account_invitations')
  await denied('select public.kp_complete_account_invitation($1,$2,$3,3)',[token,'Test','Policy'])
  await denied('select public.kp_account_invitation_completed($1)',[token])
  await db.query('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
  await db.query('set local role authenticated')
  assert.equal(await completed(token),false)
  await denied('select public.kp_complete_account_invitation($1,$2,$3,3)',[token,'Test','Policy'])
  await db.query('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[learner])
  await db.query('set local role authenticated')
  assert.equal(await completed(token),false)
  await denied('select public.kp_complete_account_invitation($1,$2,$3,3)',[token,'Test','Policy']) // Unverified email.
  await db.query('reset role')
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[learner])
  await db.query('set local role authenticated')
  await denied('select public.kp_complete_account_invitation($1,$2,$3,1)',[token,'Test','Policy'])
  await denied('select public.kp_complete_account_invitation($1,$2,$3,4)',[token,'Test','Policy'])
  await denied('select public.kp_complete_account_invitation($1,$2,$3,3)',[token,'Test',''])
  await db.query('select public.kp_complete_account_invitation($1,$2,$3,3)',[token,'Updated learner','Updated group'])
  assert.equal(await completed(token),true)
  assert.equal(await completed(otherToken),false)
  assert.equal(await completed('invalid'),false)
  assert.equal(await details(token),null)
  assert.equal(await details(otherToken),null)
  await denied('select public.kp_complete_account_invitation($1,$2,$3,3)',[token,'Reused','Group'])
  const learning=(await db.query('select * from public.kp_my_course_interest()')).rows
  assert.equal(learning.length,1)
  assert.equal(learning[0].id,chosen)
  await db.query('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
  await db.query('set local role authenticated')
  assert.equal(await completed(token),false)
  await db.query('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[learner])
  await db.query('update auth.users set email=$2 where id=$1',[learner,`changed-${email}`])
  await db.query('set local role authenticated')
  assert.equal(await completed(token),false)
  await db.query('reset role')
  await db.query('update auth.users set email=$2 where id=$1',[learner,email])
  assert.equal((await db.query('select selected_level from public.kp_profiles where user_id=$1',[learner])).rows[0].selected_level,3)
  assert.equal((await db.query('select count(*)::int count from public.kp_course_interest where email=$1',[email])).rows[0].count,3)
  assert.equal((await db.query('select name from public.kp_course_interest where id=$1',[removed])).rows[0].name,'Removed registration')
  assert.equal((await db.query('select name from public.kp_course_interest where id=$1',[interests.find(i=>i.selected_level===1).id])).rows[0].name,'Other learner')
  assert.equal((await db.query('select count(*)::int count from public.kp_memberships where user_id=$1',[learner])).rows[0].count,0)
  assert.equal((await db.query('select raw_user_meta_data from auth.users where id=$1',[learner])).rows[0].raw_user_meta_data.password_setup_complete,true)
  await db.query('rollback')
  console.log('PASS: no-deadline setup / one-hour provider limits, token isolation, expired/invalid/reused links, email ownership, required details, registered levels, confirmed learning choice, preserved original registrations, no elevated permissions. Fixtures rolled back; no emails sent.')
  if(process.argv.includes('--install')) {
    await db.query('begin')
    await db.query("set local lock_timeout='5s'; set local statement_timeout='15s'")
    await db.query(schema)
    await db.query("notify pgrst, 'reload schema'")
    await db.query('commit')
    console.log('Installed invitation schema; setup links have no deadline. No accounts, passwords or registrations changed.')
  }
} catch(error) { await db.query('rollback'); console.error(error.message); process.exitCode=1 }
finally { await db.end() }
