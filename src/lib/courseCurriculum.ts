import { useEffect, useState } from 'react'
import type { CourseVocabularyEntry } from './courseVocabularyEntries'
import type { courseVocabularyTimeline } from './courseVocabularyTimeline'
import type pacing from '../../docs/curriculum/translation-bank/vocabulary-pacing.json'
import { readWebsiteJson } from './websiteData'
export type CourseCurriculum = { source: 'database'; lessons: {
  level: number; lesson: number; status: string; title: string;
  pacing: typeof pacing.lessons[number]; timeline: ReturnType<typeof courseVocabularyTimeline>;
  entries: CourseVocabularyEntry[]; optionalEntries: CourseVocabularyEntry[];
}[] }
export function useCourseCurriculum() {
  const [data, setData] = useState<CourseCurriculum | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void readWebsiteJson<CourseCurriculum>('/__course_curriculum', controller.signal).then(result => {
      if (result.source !== 'database' || result.lessons.length !== 60) throw new Error('Course curriculum unavailable.')
      if (!controller.signal.aborted) setData(result)
    }).catch(() => { if (!controller.signal.aborted) setError('Course could not load. Refresh to retry.') })
    return () => controller.abort()
  }, [])
  return { data, error }
}
