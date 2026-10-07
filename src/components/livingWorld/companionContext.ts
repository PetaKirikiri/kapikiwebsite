import { createContext, useContext } from 'react'

export type CompanionAction = 'look-left' | 'look-right' | 'welcome' | 'celebrate'
export type CompanionCue = { action: CompanionAction; sequence: number; createdAt: number }

export const CompanionActionsContext = createContext<(action: CompanionAction) => void>(() => {})
export const CompanionStateContext = createContext<{ cue: CompanionCue | null; motionAllowed: boolean }>({ cue: null, motionAllowed: true })

export const useCompanionReaction = () => useContext(CompanionActionsContext)
