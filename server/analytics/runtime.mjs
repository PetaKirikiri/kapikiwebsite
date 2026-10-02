import pg from 'pg'
import { wordsDatabaseConnection } from '../wordsDatabase.mjs'
import { createAnalyticsHandler } from './handler.mjs'
export function analyticsRuntime(env, { allowLocal = false } = {}) {
  const pool = new pg.Pool({...wordsDatabaseConnection(env),max:2,statement_timeout:8000})
  pool.on('error',()=>{})
  const handler=createAnalyticsHandler({allowLocal,trustVercelGeo:env.VERCEL === '1',query:(...args)=>pool.query(...args),secret:env.ANALYTICS_ADMIN_KEY,verifyUser:async token=>{
    try {
      const response=await fetch(`${env.VITE_STUDENT_SUPABASE_URL || env.WORDS_SUPABASE_URL}/auth/v1/user`,{headers:{apikey:env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY || env.WORDS_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(4000)})
      const user=await response.json()
      return response.ok && user.email_confirmed_at ? {id:user.id,email:user.email} : null
    } catch { return null }
  }})
  return {handler,close:()=>pool.end()}
}
