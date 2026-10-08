import { MOE_CLASSES } from '../moeOffer'

export function accountInvitationEmail(name: string, levels: number[], setupUrl: string) {
  const firstName = name.trim().split(/\s+/)[0]
  const options = [...new Set(levels)].sort((a, b) => a - b).map(level => {
    const day = MOE_CLASSES.find(day => day.sessions.some(session => session.level === level))
    const session = day?.sessions.find(session => session.level === level)
    if (!day || !session) throw new Error('Invalid registered level')
    return { title: session.title, date: `${day.day} ${day.startDate}`, summary: `${session.title}: ${day.day} ${day.startDate} 2026, ${session.time} New Zealand time` }
  })
  if (!firstName || !options.length) throw new Error('Missing recipient details')
  const url = new URL(setupUrl)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Invalid setup URL')
  const multiple = options.length > 1
  const subject = multiple ? `${firstName}, please confirm your Ka Piki level` : `${firstName}, your Ka Piki class starts ${options[0].date}`
  const paragraphs = [
    `Kia ora ${firstName},`,
    multiple ? 'Our te reo Māori classes will now start in the week of 19 October 2026—one week later than originally planned.'
      : `Your ${options[0].title} te reo Māori class will now start on ${options[0].summary.split(': ')[1]}—one week later than originally planned.`,
    ...(multiple ? [options.map(option => option.summary).join('\n'), 'You registered for more than one level. Please choose the level you’ll attend when you open your link.'] : []),
    'Please click your personal link below to check your details, add anything missing, and set your password.',
  ]
  const signoff = ['Looking forward to getting started with you!', 'Ngā mihi,\nPeta']
  const escape = (text: string) => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!)
  const p = (text: string) => `<p style="margin:0 0 20px">${escape(text).replace(/\n/g, '<br>')}</p>`
  return { subject,
    text: [...paragraphs, `Review your details & set your password:\n${setupUrl}`, ...signoff].join('\n\n'),
    html: `<div style="max-width:640px;margin:auto;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#263b33"><div style="padding:18px 28px;background:#214b3d;color:#edf5e6;font-weight:700;letter-spacing:.12em">KA PIKI</div><div style="padding:28px;background:#fff">${paragraphs.map(p).join('')}<p style="margin:6px 0 28px"><a href="${escape(setupUrl)}" style="display:inline-block;padding:12px 20px;background:#214b3d;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Review your details &amp; set your password</a></p>${signoff.map(p).join('')}</div></div>`,
  }
}
