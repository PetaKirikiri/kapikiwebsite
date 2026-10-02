import { timingSafeEqual } from 'node:crypto'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function localRequest(req) {
  return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress) && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')
}
function authorized(req, secret, allowLocal) {
  if (allowLocal && localRequest(req)) return true
  const given = Buffer.from(String(req.headers['x-analytics-key'] || ''))
  const expected = Buffer.from(secret || '')
  return expected.length >= 24 && given.length === expected.length && timingSafeEqual(given, expected)
}
export function createAnalyticsHandler({ query, secret, allowLocal = false, trustVercelGeo = false, verifyUser = async () => null }) {
  return async (req, res) => {
    const reply = (status, data) => { res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'X-Robots-Tag':'noindex'}); res.end(JSON.stringify(data)) }
    if (req.method === 'GET') {
      if (!authorized(req, secret, allowLocal)) return reply(401, {error:'Enter your analytics access key.'})
      const url = new URL(req.url, 'http://local')
      const days = [1,7,30,90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7
      const environment = url.searchParams.get('environment') === 'local' ? 'local' : 'live'
      const visitor = url.searchParams.get('visitor')
      if (visitor && !uuid.test(visitor)) return reply(400, {error:'Invalid visitor.'})
      try {
        const params = [days, environment]
        const where = `environment=$2 and visited_at >= now()-($1::int * interval '1 day')`
        if (visitor) {
          const result = await query(`select path,visited_at,email,device,referrer,country from public.kp_page_visits where ${where} and visitor_id=$3 order by visited_at desc limit 500`, [...params,visitor])
          return reply(200, {events:result.rows})
        }
        const summary = await query(`select count(*)::int as views,count(distinct visitor_id)::int as visitors,count(distinct session_id)::int as sessions from public.kp_page_visits where ${where}`, params)
        const visitors = await query(`select visitor_id,min(visited_at) as first_seen,max(visited_at) as last_seen,count(*)::int as views,count(distinct session_id)::int as sessions,(array_agg(country order by visited_at desc))[1] as country,(array_agg(email order by visited_at desc) filter (where email is not null))[1] as email from public.kp_page_visits where ${where} group by visitor_id order by last_seen desc limit 200`, params)
        const pages = await query(`select path,count(*)::int as views from public.kp_page_visits where ${where} group by path order by views desc limit 30`,params)
        return reply(200,{summary:summary.rows[0],visitors:visitors.rows,pages:pages.rows})
      } catch { return reply(503,{error:'Visits could not be loaded. Please retry.'}) }
    }
    if (req.method !== 'POST') return reply(405,{error:'Method not allowed.'})
    try {
      if (req.headers['sec-fetch-site'] === 'cross-site' || !req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) return reply(403,{error:'Use this website.'})
      if (!String(req.headers['content-type']).startsWith('application/json')) return reply(415,{error:'JSON required.'})
      let body = req.body
      if (body === undefined) {
        let size=0; const chunks=[]
        for await (const chunk of req) { size+=Buffer.byteLength(chunk); if(size>2048) return reply(413,{error:'Request too large.'}); chunks.push(Buffer.from(chunk)) }
        body=JSON.parse(Buffer.concat(chunks).toString())
      } else { if (Buffer.byteLength(JSON.stringify(body))>2048) return reply(413,{error:'Request too large.'}); if(typeof body==='string') body=JSON.parse(body) }
      if (!body || ![body.id,body.visitor,body.session].every(value=>uuid.test(value)) || !['phone','tablet','desktop'].includes(body.device) || typeof body.path!=='string' || body.path.length>200 || !/^\/[a-z0-9/_-]*(?:#[a-z0-9/_-]*(?:\?tab=(?:structures|vocabulary|stories|practice))?)?$/i.test(body.path)) return reply(400,{error:'Invalid visit.'})
      let referrer=null
      if (body.referrer) { const url=new URL(body.referrer); if(['http:','https:'].includes(url.protocol)) referrer=url.origin.slice(0,200) }
      const token=String(req.headers.authorization || '').replace(/^Bearer /,'')
      const user=token ? await verifyUser(token) : null
      const headerCountry = req.headers['x-vercel-ip-country']
      const country = trustVercelGeo && !localRequest(req) && typeof headerCountry === 'string' && /^[A-Z]{2}$/.test(headerCountry) && !['XX','ZZ'].includes(headerCountry) ? headerCountry : null
      await query(`insert into public.kp_page_visits(id,visitor_id,session_id,path,referrer,device,user_id,email,environment,country) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(id) do nothing`,[body.id,body.visitor,body.session,body.path,referrer,body.device,user?.id || null,user?.email || null,allowLocal && localRequest(req)?'local':'live',country])
      return reply(201,{saved:true})
    } catch { return reply(503,{error:'Visit could not be recorded.'}) }
  }
}
