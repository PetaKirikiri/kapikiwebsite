import { useId } from 'react'
import { WARM_UP_PHASES, warmUpQuestion, type WarmUpPhase, type WarmUpPlan } from '../../lib/lessons/warmUp'
import LessonQuestion from './LessonQuestion'
import './LessonWarmUp.css'

export type WarmUpPosition = { phase: WarmUpPhase; index: number }

export default function LessonWarmUp({ plan, position, onChange, onFinish, onOpenChat, active }: {
  plan: WarmUpPlan
  position: WarmUpPosition
  onChange: (position: WarmUpPosition) => void
  onFinish: () => void
  onOpenChat: () => void
  active: boolean
}) {
  const id = useId()
  const phaseIndex = WARM_UP_PHASES.findIndex(phase => phase.id === position.phase)
  const phase = WARM_UP_PHASES[phaseIndex]
  const activities = plan.phases[phase.id]
  const index = Math.min(Math.max(0, position.index), Math.max(0, activities.length - 1))
  const activity = activities[index]
  const question = warmUpQuestion(activity)
  const previous = () => {
    if (index > 0) onChange({ phase: phase.id, index: index - 1 })
    else if (phaseIndex > 0) {
      const previousPhase = WARM_UP_PHASES[phaseIndex - 1].id
      onChange({ phase: previousPhase, index: Math.max(0, plan.phases[previousPhase].length - 1) })
    }
  }
  const next = () => {
    if (index + 1 < activities.length) onChange({ phase: phase.id, index: index + 1 })
    else if (phaseIndex + 1 < WARM_UP_PHASES.length) onChange({ phase: WARM_UP_PHASES[phaseIndex + 1].id, index: 0 })
    else onFinish()
  }

  return <section className="lesson-teaching-card lesson-warm-up" aria-labelledby={`${id}-title`}>
    <header className="lesson-warm-up-heading"><h1 id={`${id}-title`}>Warm-up</h1><span>{plan.duration_minutes} min</span></header>
    <nav aria-label="Warm-up steps"><ol className="lesson-warm-up-steps">
      {WARM_UP_PHASES.map((item, step) => <li key={item.id}><button type="button" aria-current={item.id === phase.id ? 'step' : undefined} aria-controls={`${id}-activity`} onClick={() => onChange({ phase: item.id, index: 0 })}><span aria-hidden="true">{step + 1}</span>{item.label}</button></li>)}
    </ol></nav>
    <div id={`${id}-activity`} className="lesson-warm-up-activity" aria-live="polite">
      {activity ? <>
        <h2>{activity.title}</h2>
        {activity.prompt_en && <p className="lesson-warm-up-prompt">{activity.prompt_en}</p>}
        {activity.prompt_mi && <LessonQuestion key={`${activity.id}-prompt`} text={activity.prompt_mi} active={active} clue={activity.mode === 'presentation' ? activity.railClue : undefined} />}
        {activity.mode === 'chat' && (question ? <>
          <LessonQuestion key={question.id} text={question.text} active={active} />
          <button className="lesson-warm-up-chat" type="button" onClick={onOpenChat}>Answer in chat</button>
        </> : <p className="lesson-warm-up-empty">Question unavailable.</p>)}
      </> : <p className="lesson-warm-up-empty">{phase.id === 'check' ? 'No questions added yet.' : 'No content added yet.'}</p>}
    </div>
    <footer className="lesson-warm-up-controls">
      <button type="button" disabled={phaseIndex === 0 && index === 0} onClick={previous}>Back</button>
      <span>{activities.length > 1 ? `${index + 1} / ${activities.length}` : ''}</span>
      <button type="button" onClick={next}>{phaseIndex === WARM_UP_PHASES.length - 1 && index >= activities.length - 1 ? 'New skill' : 'Next'}</button>
    </footer>
  </section>
}
