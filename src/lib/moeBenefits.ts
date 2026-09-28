export const MOE_BENEFITS = [
  { id: 'levels', label: '6 levels', summary: 'Build your reo', group: 'format', title: 'Find your next step.', intro: 'From your first introduction to confident conversation. Choose the level that fits what you can do now.', points: ['Start at your level', 'Build practical skills', 'Grow into conversation'] },
  { id: 'course-length', label: '10 weeks', summary: 'Per course', group: 'format', title: 'Time to make it familiar.', intro: 'One course, ten weeks of returning to useful language and putting it into practice.', points: ['Learn together each week', 'Revisit familiar language', 'Build confidence over time'] },
  { id: 'live-classes', label: 'Live classes', summary: '1 hour weekly', group: 'format', title: 'An hour of using your reo.', intro: 'Join your teacher and classmates online. Ask, listen and respond through shared language activities.', points: ['Teacher-led sessions', 'Activities with classmates', 'Practice that has a purpose'] },
  { id: 'app', label: 'App included', summary: 'Between classes', group: 'format', title: 'Keep your reo growing.', intro: 'Short practice between classes helps familiar language become more instinctive.', points: ['See how sentences fit', 'Connect words and meaning', 'Repeat at your own pace'] },
  { id: 'recorded-lessons', label: 'Recorded lessons', summary: 'Revisit lessons and catch up between classes.', group: 'support', title: 'Come back to the lesson.', intro: 'Recorded videos give you another chance to listen, revisit a tricky point and practise again.', points: ['Catch up in your own time', 'Pause and listen again', 'Return to class prepared'] },
  { id: 'digital-syllabus', label: 'Full digital syllabus', summary: 'Your course content, organised topic by topic.', group: 'support', title: 'Your course, in one place.', intro: 'Follow the topics, see worked examples and return to the language you are practising.', points: ['A clear learning sequence', 'Examples you can revisit', 'Language connected to your life'] },
  { id: 'bespoke-activities', label: 'Bespoke activities', summary: 'Digital language activities created for KA PIKI.', group: 'support', title: 'Made for the way we teach.', intro: 'Our own digital activities, designed around the language you are learning. Use your reo to ask, solve and achieve something together.', points: ['Purpose-built for KA PIKI', 'Language with a purpose', 'Confidence through repetition'] },
  { id: 'stories-games', label: 'Stories & games', summary: 'Supplementary content for extra practice.', group: 'support', title: 'More ways into your reo.', intro: 'Bring the course language into stories and play. Follow a worked example, ask questions and revisit familiar words in a new setting.', points: ['Language in context', 'Stories to explore', 'Games to practise together'] },
  { id: 'progress-reports', label: 'Tracking & reports', summary: 'Follow student progress and team capability.', group: 'support', title: 'See what is growing.', intro: 'Bring individual practice and team capability into view, so the next learning step is easier to see.', points: ['Follow learner progress', 'See strengths and gaps', 'Focus the next step'] },
  { id: 'student-management', label: 'Student management', summary: 'Keep enrolments and class groups organised.', group: 'support', title: 'Keep your learners connected.', intro: 'Organise students around their level and class, with a clear view of who is learning together.', points: ['Coordinate enrolments', 'Organise class groups', 'Connect learning and progress'] },
  { id: 'class-bookings', label: 'Class bookings', summary: 'Coordinate places in the right level and weekly class.', group: 'support', title: 'Find a class that fits.', intro: 'Choose a level and weekly time, then register your interest for the Ministry staff intake.', points: ['Six level options', 'A regular weekly time', 'MOE intake registration'] },
  { id: 'public-sector-capability', label: 'Public-sector capability', summary: 'Support your organisation’s te reo Māori goals.', group: 'support', title: 'Turn reo goals into practice.', intro: 'Give staff a practical learning pathway that supports your organisation’s Māori language capability goals.', points: ['Set meaningful reo goals', 'Support regular learning', 'Review progress together'] },
] as const

const LEARNER_BENEFITS = [
  { id: 'professional-learning', label: 'Te reo Māori skills' },
  { id: 'course-certificate', label: 'Certificate' },
  { id: 'everyday-reo', label: 'Reo for everyday life' },
  { id: 'learning-support', label: 'App-based support' },
  { id: 'capability-reference', label: 'Capability levels' },
] as const
export type MoeBenefit = typeof MOE_BENEFITS[number] | typeof LEARNER_BENEFITS[number]
export type MoeBenefitId = MoeBenefit['id']
export function moeBenefitRoute(id: MoeBenefitId) { return `#moe/benefits/${id}` }
export function findMoeBenefit(id: string) { return MOE_BENEFITS.find(benefit => benefit.id === id) ?? LEARNER_BENEFITS.find(benefit => benefit.id === id) }

// Facts and services without a substantive preview do not get a detail-page link.
export function moeBenefitAction(id: MoeBenefitId): { href: string; label: string } | null {
  switch (id) {
    case 'professional-learning':
    case 'learning-support':
    case 'capability-reference':
    case 'course-certificate':
    case 'everyday-reo': return { href: moeBenefitRoute(id), label: 'Explore more' }
    case 'course-length':
    case 'recorded-lessons':
    case 'student-management': return null
    case 'levels': return { href: '#moe/levels', label: 'View levels' }
    case 'class-bookings': return { href: '#moe?timetable', label: 'View class times' }
    case 'public-sector-capability':
    case 'progress-reports': return { href: '#moe/competency', label: 'View capabilities' }
    case 'app': return { href: moeBenefitRoute(id), label: 'See the app' }
    case 'live-classes': return { href: moeBenefitRoute(id), label: 'See the classroom' }
    case 'digital-syllabus': return { href: moeBenefitRoute(id), label: 'Browse content' }
    case 'bespoke-activities': return { href: moeBenefitRoute(id), label: 'See activities' }
    case 'stories-games': return { href: moeBenefitRoute(id), label: 'Browse stories & games' }
  }
}
