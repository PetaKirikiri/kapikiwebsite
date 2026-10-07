import { useWordSupport } from '../useWordSupport'
import { wordSupportTarget } from '../../lib/connectorPresentation/wordSupport'
import { useEffect, useMemo, useState } from 'react'
import { readWebsiteCourse, subscribeToWebsiteCourse, type WebsiteCourseData } from '../../lib/websiteCourseData'
import { courseBigWords } from '../../lib/courseBigWords'
import { requestRails } from '../../lib/connectorPresentation/engine'
import { compileConnectorLibrary } from '../../lib/connectorPresentation/blueprints'
import { useDesignSpaceCollection } from '../useDesignSpaceCollection'
import { useConnectorPatterns } from '../../hooks/useConnectorPatterns'
import LessonRailSpecimen from './LessonRailSpecimen'

export default function LessonBigWords({ onSelect, explore = false, words }: { onSelect?: (word: string) => void; explore?: boolean; words?: readonly string[] } = {}) {
  const support = useWordSupport()
  const [selected, setSelected] = useState<string | null>(null)
  const choose = onSelect ?? (explore ? setSelected : undefined)
  const Item = choose ? 'button' : 'div'
  const [course, setCourse] = useState<WebsiteCourseData | null>(null)
  const [error, setError] = useState('')
  const { collection, error: shapeError } = useDesignSpaceCollection({ production: true })
  const { rules, error: ruleError } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  useEffect(() => {
    let active = true
    const accept = (data: WebsiteCourseData) => { if (active) { setCourse(data); setError('') } }
    const unsubscribe = subscribeToWebsiteCourse(accept)
    void readWebsiteCourse().then(accept).catch(() => { if (active) setError('Big words could not load.') })
    return () => { active = false; unsubscribe() }
  }, [])
  const allGroups = course ? courseBigWords(course.sentences, 1) : []
  const groups = words ? words.flatMap(word => {
    const group = allGroups.find(item => item.label === word)
    return group ? [group] : []
  }) : allGroups
  return <>
    {(error || ((shapeError || ruleError) && !groups.length)) && <p role="alert">Rails could not load.</p>}
    {!course && !error && !shapeError && !ruleError && <p role="status">Loading Big words…</p>}
    <div className="lesson-word-showcase">{groups.map(group => {
      const example = group.examples[0]
      const source = course!.sentences.find(sentence => sentence.structureId === example.structureId && sentence.textMi === example.textMi)
      const plans = source?.state ? requestRails({ kind: 'specimen', text: source.textMi, state: source.state,
        families: new Map(course!.catalog.posTypes.map(pos => [pos.posCode, pos.groupCode])), library, rules,
        indices: example.indices, label: group.label }) : []
      return <Item {...(onSelect ? {} : support.hover(wordSupportTarget(group.label, null)))} key={`${group.label}:${group.purpose}`} lang="mi" {...(choose ? { type: 'button' as const, disabled: !plans.length, onClick: () => choose(group.label), 'aria-label': `Choose ${group.label}`, ...(explore ? { 'aria-pressed': selected === group.label } : {}) } : {})}><span className="lesson-big-word-specimen">
        <LessonRailSpecimen plans={plans} />
        {group.label}
      </span>{explore && selected === group.label && <small className="lesson-word-purpose">{group.purpose}</small>}</Item>
    })}</div>{support.modal}
  </>
}
