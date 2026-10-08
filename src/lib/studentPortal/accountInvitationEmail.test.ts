import { expect, it } from 'vitest'
import { accountInvitationEmail } from './accountInvitationEmail'

it('uses the revised wording without claiming fields were missing from the original signup',()=>{
  const mail=accountInvitationEmail('Fiona McIver',[3],'https://example.com/account-setup.html#token=unique-fiona')
  expect(mail.text).toContain('check your details, add anything missing, and set your password')
  expect(mail.text).not.toContain('department')
  expect(mail.text).toContain('Tuesday 20 October 2026, 1pm – 2pm New Zealand time')
  expect(mail.html).toContain('href="https://example.com/account-setup.html#token=unique-fiona"')
})
it('personalises each recipient and includes their own level options and link',()=>{
  const a=accountInvitationEmail('Aimee Maaka',[2,3,2],'https://example.com/account-setup.html#token=unique-a')
  const b=accountInvitationEmail('Karly Garnock-Jones',[4,5],'https://example.com/account-setup.html#token=unique-b')
  expect(a.text).toContain('Kia ora Aimee,')
  expect(a.text).toContain('Level 2: Monday 19 October')
  expect(a.text).toContain('Level 3: Tuesday 20 October')
  expect(a.text).toContain('choose the level you’ll attend')
  expect(b.text).toContain('Kia ora Karly,')
  expect(b.text).toContain('Level 5: Wednesday 21 October')
  expect(b.html).not.toContain('unique-a')
})
it('escapes names and rejects unsafe link schemes',()=>{
  expect(accountInvitationEmail('<script>',[1],'https://example.com').html).not.toContain('<script>')
  expect(()=>accountInvitationEmail('Learner',[1],'javascript:alert(1)')).toThrow('Invalid setup URL')
})
