import { findMoeBenefit } from './moeBenefits'
import type { CurriculumLevel } from './sentenceStructureLevels'

export type LevelTab = 'structures' | 'vocabulary' | 'stories' | 'practice'

export function normaliseWebsiteHash(hash: string) {
  const [path, query] = (hash || '#website-top').split('?')
  const aliases: Record<string, string> = {
    '#methodology': '#level-finder', '#teacher': '#about',
    '#app-showcase': '#benefits/app', '#live-classes': '#benefits/live-classes',
    '#moe/benefits/levels': '#moe/levels', '#benefits/levels': '#level-finder',
    '#classroom-2d': '#classroom',
    '#moe/benefits/course-length': '#moe', '#benefits/course-length': '#level-finder',
    '#moe/benefits/recorded-lessons': '#moe', '#benefits/recorded-lessons': '#level-finder',
    '#moe/benefits/student-management': '#moe', '#benefits/student-management': '#level-finder',
    '#moe/benefits/class-bookings': '#moe?timetable', '#benefits/class-bookings': '#level-finder',
    '#moe/benefits/progress-reports': '#moe/competency', '#benefits/progress-reports': '#competency',
    '#moe/benefits/public-sector-capability': '#moe/competency', '#benefits/public-sector-capability': '#competency',
  }
  const destination = aliases[path!] ?? path!
  const [nextPath, nextQuery] = destination.split('?')
  const params = new URLSearchParams(query)
  new URLSearchParams(nextQuery).forEach((value, key) => params.set(key, value))
  return nextPath + (params.size ? `?${params}` : '')
}
export function websiteRoute(hash: string) {
  const canonical = normaliseWebsiteHash(hash)
  const [path, query] = canonical.split('?')
  const moe = path === '#moe' || path!.startsWith('#moe/')
  const surface = moe ? (path === '#moe' ? '#moe' : '#' + path!.slice(5)) : path!
  const levelMatch = /^#levels\/([1-6])$/.exec(surface)
  const level = levelMatch ? Number(levelMatch[1]) as CurriculumLevel : null
  const feature = /^#benefits\/([a-z-]+)$/.exec(surface)
  const benefit = feature ? findMoeBenefit(feature[1]!) : undefined
  const overview = surface === '#levels' || surface === '#level-finder'
  const shared = ['#about', '#competency', '#practice', '#join', '#account']
  const known = level || benefit || overview || shared.includes(surface) || (moe ? surface === '#moe' : ['#website-top', '#training', '#training-admin', '#classroom', '#classroom-3d', '#live-class', '#guess-who', '#kitchen'].includes(surface))
  const params = new URLSearchParams(query)
  const section = params.get('section')
  const classNumber = params.get('class')
  const target = level === 1 && section && /^[1-7]$/.test(section) ? `pepeha-section-${section}` : classNumber && /^[1-6]$/.test(classNumber) ? `moe-class-${classNumber}` : params.has('timetable') ? 'moe-timetable' : null
  const requestedTab = params.get('tab')
  const tab: LevelTab = level === 1 && target?.startsWith('pepeha-') ? 'stories' : requestedTab === 'vocabulary' || requestedTab === 'stories' || requestedTab === 'practice' ? requestedTab : 'structures'
  const example = Math.max(1, Math.min(1000, Number(params.get('example')) || 1))
  return { tab, example: Math.floor(example), canonical, path: path!, moe, surface, level, benefit, overview, notFound: !known, target }
}
export function contextualRoute(moe: boolean, path: string) {
  if (!moe) return path
  return path === '#level-finder' ? '#moe/levels' : `#moe/${path.slice(1)}`
}
