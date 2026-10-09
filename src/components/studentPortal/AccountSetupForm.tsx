import { useRef, useState, type FormEvent } from 'react'
import { MOE_CLASSES } from '../../lib/moeOffer'
import '../SiteIdentity.css'
import './AccountSetupForm.css'

export type AccountSetupDetails = {
  name: string
  email: string
  selectedLevel: number
  registeredLevels?: number[]
  departmentGroup: string
}

type Props = {
  details: AccountSetupDetails
  onSave?: (details: AccountSetupDetails & { password: string }) => Promise<void>
}

export default function AccountSetupForm({ details, onSave }: Props) {
  const registeredLevels = [...new Set(details.registeredLevels ?? [details.selectedLevel])]
    .filter(level => Number.isInteger(level) && level >= 1 && level <= 6).sort((a, b) => a - b)
  const needsLevelChoice = registeredLevels.length > 1
  const [selectedLevel, setSelectedLevel] = useState<number | null>(() => needsLevelChoice ? null : registeredLevels[0] ?? null)
  const levelConfirmed = selectedLevel !== null
  const [department, setDepartment] = useState(details.departmentGroup)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState('')
  const day = MOE_CLASSES.find(day => day.sessions.some(session => session.level === selectedLevel))
  const course = day?.sessions.find(session => session.level === selectedLevel)
  const firstName = details.name.trim().split(/\s+/)[0]

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSave || pending.current) return
    if (selectedLevel === null) { setError('Please choose your level.'); return }
    const fields = new FormData(event.currentTarget)
    const password = String(fields.get('password') ?? '')
    if (password !== fields.get('confirmPassword')) { setError('Your passwords don’t match.'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      await onSave({ ...details, selectedLevel, name: String(fields.get('name') ?? '').trim(), departmentGroup: department.trim(), password })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your details could not be saved. Please try again.')
    } finally { pending.current = false; setBusy(false) }
  }

  return <main className="account-setup-page">
    <div className="account-setup-brand"><span>KA PIKI</span>{!onSave && <span className="account-setup-preview">Preview · nothing is saved</span>}</div>
    <section className="account-setup-card site-card" aria-labelledby="account-setup-heading">
      <header className="site-card-cover account-setup-heading">
        <h1 id="account-setup-heading">Kia ora {firstName}</h1>
        <p>Check your details and set your password.</p>
      </header>
      {!needsLevelChoice && course && day && <div className="account-setup-class">
        <strong>{course.title}</strong>
        <span><time dateTime={day.firstDate}>{day.day} {day.startDate} 2026</time><small>{course.time} · New Zealand time</small></span>
      </div>}
      <form onSubmit={save} className="account-setup-form" aria-busy={busy}>
        {needsLevelChoice && <fieldset className="account-level-choice" disabled={busy}>
          <legend>Choose your level{!levelConfirmed && <small className="account-setup-required">Required</small>}</legend>
          <div className="account-level-options">
            {registeredLevels.map(level => {
              const classDay = MOE_CLASSES.find(day => day.sessions.some(session => session.level === level))!
              const option = classDay.sessions.find(session => session.level === level)!
              return <label className="account-level-option" key={level}>
                <input type="radio" name="course_level" value={level} checked={selectedLevel === level} required aria-label={`Level ${level}`} onChange={() => { setSelectedLevel(level); setError('') }} />
                <strong>{option.title}</strong>
                <span className="account-level-description">{option.description}</span>
                <span className="account-level-date"><time dateTime={classDay.firstDate}>{classDay.day} {classDay.startDate}</time><small>{option.time} · NZ time</small></span>
              </label>
            })}
          </div>
        </fieldset>}
        <div className="account-setup-columns">
          <fieldset disabled={busy}>
            <legend><span className="account-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg></span><span>Your details</span></legend>
            <label htmlFor="account-setup-name">Full name</label>
            <input id="account-setup-name" name="name" autoComplete="name" defaultValue={details.name} placeholder="Please enter your full name" required maxLength={160} />
            <label htmlFor="account-setup-email">Email</label>
            <textarea id="account-setup-email" name="email" autoComplete="username" value={details.email} rows={Math.max(1, Math.ceil(details.email.length / 32))} readOnly />
            <label htmlFor="account-setup-department" className="account-setup-department-label">Department / group{!department.trim() && <small>Required</small>}</label>
            <input id="account-setup-department" name="department_group" placeholder="Please enter your department / group" value={department} onChange={event => setDepartment(event.target.value)} required maxLength={160} className={!department.trim() ? 'account-setup-missing' : ''} />
          </fieldset>
          <fieldset disabled={busy}>
            <legend><span className="account-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></svg></span><span>Set your password</span></legend>
            <label htmlFor="account-setup-password">Password</label>
            <input id="account-setup-password" name="password" placeholder="Please enter a password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="account-setup-password-help" />
            <small id="account-setup-password-help">At least 8 characters</small>
            <label htmlFor="account-setup-confirm">Confirm password</label>
            <input id="account-setup-confirm" name="confirmPassword" placeholder="Please re-enter your password" type="password" autoComplete="new-password" required minLength={8} />
          </fieldset>
        </div>
        {error && <p className="account-setup-error" role="alert">{error}</p>}
        <footer><button type="submit" disabled={busy || !onSave || !levelConfirmed}>{busy ? 'Saving…' : 'Save details & continue'}</button></footer>
      </form>
    </section>
  </main>
}
