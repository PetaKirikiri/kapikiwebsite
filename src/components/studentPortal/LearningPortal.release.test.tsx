import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { LearningDashboard } from './LearningPortal'
vi.mock('./StudentWorkspace', () => ({ default: () => null }))
it('shows the temporary course notice instead of lesson access while retaining account controls', async () => {
  vi.stubGlobal('React', React)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div'); const root = createRoot(host)
  const renderContent = vi.fn()
  try {
    await act(async () => root.render(<LearningDashboard account={<details><summary>Account</summary></details>} renderContent={renderContent} data={{ records: [], interests: [], training: [], assessments: [], lessons: [] }} />))
    expect(host.textContent).toContain('Course content is being updated')
    expect(host.textContent).toContain('You’ll be emailed once your course is accessible.')
    expect(host.querySelector('details')).not.toBeNull()
    expect(host.querySelectorAll('.learning-lesson-row')).toHaveLength(0)
    expect(renderContent).not.toHaveBeenCalled()
  } finally { await act(async () => root.unmount()); vi.unstubAllGlobals() }
})
