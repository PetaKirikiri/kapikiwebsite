import type { CurriculumLevel } from '../lib/sentenceStructureLevels'
import MoeOffer, { type MoeOfferContent } from './MoeOffer'

// Both versions render the same component. V2 changes content, never layout.
const content: MoeOfferContent = {
  lead: 'Develop your te reo Māori for work and future roles.',
  audience: '',
  action: { href: '#moe?timetable', label: 'Explore six levels' },
  learnerClasses: true,
  benefits: [
    { id: 'professional-learning', label: 'Te reo Māori skills', summary: 'Build the language skills to introduce yourself, take part in conversations and express your ideas.', group: 'format', action: { href: '#moe/benefits/professional-learning', label: 'Explore more' } },
    { id: 'course-certificate', label: 'Certificate', summary: 'Pass your course and add the certificate to your CV and LinkedIn.', group: 'format', action: { href: '#moe/benefits/course-certificate', label: 'Explore more' } },
    { id: 'live-classes', label: 'Live online', summary: 'Join from work or home.', group: 'support', action: null },
    { id: 'course-length', label: '10 weeks', summary: 'From the week of 12 October.', group: 'support', action: null },
    { id: 'class-bookings', icon: 'duration', label: '1 hour weekly', summary: 'Choose a class that fits your week.', group: 'support', action: null },
    { id: 'learning-support', label: 'App-based support', summary: 'Practise when it suits you, between classes.', group: 'support', action: { href: '#moe/benefits/learning-support', label: 'Explore more' } },
  ],
}

export default function MoeOfferV2({ onRegister }: { onRegister: (level: CurriculumLevel, context: string) => void }) {
  return <MoeOffer content={content} onRegister={onRegister} />
}
