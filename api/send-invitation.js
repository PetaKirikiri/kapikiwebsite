import { interestQuery } from '../interest-api.mjs'
import { authorizedInvitationSend, deliverInvitation } from '../invitation-mail.mjs'
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store')
 const id=req.body?.invitationId
 if(req.method!=='POST') {res.statusCode=405;return res.end('POST required')}
 if(!authorizedInvitationSend(req.headers,id,process.env.STUDENT_SUPABASE_SECRET_KEY)) {res.statusCode=401;return res.end('Unauthorized')}
 try {const result=await deliverInvitation(interestQuery,id);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result))}
 catch {res.statusCode=503;res.end('Sending needs review')}
}
