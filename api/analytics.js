import { analyticsRuntime } from '../server/analytics/runtime.mjs'
let runtime
export default async function handler(req,res) {
 try { runtime ||= analyticsRuntime(process.env); await runtime.handler(req,res) }
 catch { res.statusCode=503; res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'Analytics unavailable.'})) }
}
