import { MOE_CLASSES } from '../moeOffer'

export function accountInvitationEmail(name: string, levels: number[], setupUrl: string) {
  const firstName = name.trim().split(/\s+/)[0]
  const options = [...new Set(levels)].sort((a, b) => a - b).map(level => {
    const day = MOE_CLASSES.find(day => day.sessions.some(session => session.level === level))
    const session = day?.sessions.find(session => session.level === level)
    if (!day || !session) throw new Error('Invalid registered level')
    return { title: session.title, date: `${day.day} ${day.startDate}`, time: session.time, summary: `${session.title}: ${day.day} ${day.startDate} 2026, ${session.time} New Zealand time` }
  })
  if (!firstName || !options.length) throw new Error('Missing recipient details')
  const url = new URL(setupUrl)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Invalid setup URL')
  const multiple = options.length > 1
  const subject = multiple ? `${firstName}, please confirm your Ka Piki level` : `${firstName}, your Ka Piki class starts ${options[0].date}`
  const greeting = `Kia ora ${firstName},`
  const introduction = 'Your te reo Māori classes will start one week later than originally planned.'
  const choice = 'You registered for more than one level. Please choose the level you’ll attend when you open your link.'
  const instruction = 'Please click your personal link below to check your details, add anything missing, and set your password.'
  const paragraphs = [greeting, introduction, options.map(option => option.summary).join('\n'), ...(multiple ? [choice] : []), instruction]
  const signoff = ['Looking forward to getting started with you!', 'Ngā mihi,\nPeta']
  const escape = (text: string) => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!)
  const p = (text: string) => `<p style="margin:0 0 20px">${escape(text).replace(/\n/g, '<br>')}</p>`
  return { subject,
    text: [...paragraphs, `Review your details & set your password:\n${setupUrl}`, ...signoff].join('\n\n'),
    html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font:16px/1.6 Arial,sans-serif;color:#263b33"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;text-align:left"><tr><td style="padding:20px 24px;border-bottom:3px solid #214b3d;color:#214b3d;font-weight:700;letter-spacing:3px">KA PIKI</td></tr><tr><td style="padding:24px">${p(greeting)}${p(introduction)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 24px;background:#f1f5ef;border-left:3px solid #214b3d">${options.map(option => `<tr><td style="padding:16px 18px"><strong style="color:#214b3d">${escape(option.title)}</strong><br><span style="font-size:18px;font-weight:600">${escape(option.date)} 2026</span><br>${escape(option.time)}<br><span style="font-size:14px;color:#607164">New Zealand time</span></td></tr>`).join('')}</table>
      ${multiple ? p(choice) : ''}${p(instruction)}<p style="margin:0 0 28px"><a href="${escape(setupUrl)}" style="color:#175c91;text-decoration:underline;font-weight:600;line-height:1.6">Check your details &amp; set your password</a></p>${signoff.map(p).join('')}</td></tr></table></td></tr></table></body></html>`,
  }
}
