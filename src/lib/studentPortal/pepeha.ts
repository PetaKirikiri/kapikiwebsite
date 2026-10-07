import { studentClient } from './client'

const fields = ['father_name', 'mother_name', 'father_origin', 'mother_origin'] as const
export type PepehaAnswer = { field: typeof fields[number]; value: string; answer: string; question: string; updated_at: string }
const questions = ['Ko wai tō matua?', 'Ko wai tō whaea?', 'Nō hea tō matua?', 'Nō hea tō whaea?']
const guestKey = (name: string) => `ka-piki:guest-pepeha:${encodeURIComponent(name.trim())}`

export function pepehaAnswer(index: number, answer: string): PepehaAnswer | null {
  if (!fields[index]) return null
  const prefix = index < 2 ? /^ko\s+(.+?)\s*[.!]?$/iu : /^nō\s+(.+?)\s*[.!]?$/iu
  const match = prefix.exec(answer.normalize('NFC').trim())
  if (!match || !match[1].trim()) return null
  return { field: fields[index], value: match[1].trim(), answer: answer.trim(), question: questions[index], updated_at: new Date().toISOString() }
}

export async function savePepehaAnswer(index: number, answer: string, guestName = ''): Promise<'account' | 'device' | null> {
  const fact = pepehaAnswer(index, answer)
  if (!fact) return null
  const { data } = studentClient ? await studentClient.auth.getUser() : { data: { user: null } }
  if (data.user && studentClient) {
    const { error } = await studentClient.from('kp_pepeha_answers').upsert({ ...fact, user_id: data.user.id }, { onConflict: 'user_id,field' })
    if (error) throw error
    return 'account'
  }
  // Guest drafts stay on this browser; never silently attach them to another login.
  const existing = JSON.parse(localStorage.getItem(guestKey(guestName)) ?? '{}')
  localStorage.setItem(guestKey(guestName), JSON.stringify({ ...existing, [fact.field]: fact }))
  return 'device'
}

export async function readPepehaAnswers(guestName = ''): Promise<PepehaAnswer[]> {
  const { data } = studentClient ? await studentClient.auth.getUser() : { data: { user: null } }
  if (!data.user || !studentClient) return Object.values(JSON.parse(localStorage.getItem(guestKey(guestName)) ?? '{}'))
  const { data: answers, error } = await studentClient.from('kp_pepeha_answers').select('field,value,answer,question,updated_at').eq('user_id', data.user.id)
  if (error) throw error
  return answers ?? []
}
