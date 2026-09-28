import { z } from 'zod'
import { busManifestPosCatalogSchema, busManifestSheetSchema } from './busManifestContract'
import { sentenceStructureRosterItemSchema } from './sentenceStructureContract'
import { localFirstRead, subscribeToLocalFirstData } from './localFirstData'
import { readWebsiteJson } from './websiteData'

const courseSchema = z.object({
  catalog: busManifestPosCatalogSchema,
  sentences: z.array(sentenceStructureRosterItemSchema.extend({ state: busManifestSheetSchema.nullable() }).strict()),
}).strict()

export type WebsiteCourseData = z.infer<typeof courseSchema>
export const WEBSITE_COURSE_KEY = ['website-course', 'v1'] as const

// Same versioned IndexedDB display cache as the Review Desk; never tagging evidence.
// The shared request outlives a component remount, so StrictMode does not cancel
// and restart the database read. Unmounted views simply unsubscribe.
export function readWebsiteCourse(): Promise<WebsiteCourseData> {
  return localFirstRead(WEBSITE_COURSE_KEY, async () => courseSchema.parse(
    await readWebsiteJson<unknown>('/__website_preview_data', new AbortController().signal),
  ))
}

export function subscribeToWebsiteCourse(listener: (data: WebsiteCourseData) => void) {
  return subscribeToLocalFirstData<WebsiteCourseData>(WEBSITE_COURSE_KEY, listener)
}
