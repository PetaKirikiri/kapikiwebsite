import { LEVEL_ONE_CONTENT } from './levelOneContent'

const greetingsSource = 'https://www.auckland.ac.nz/en/on-campus/life-on-campus/maori-life-on-campus/revitalising-te-reo-maori/kuputaka/greetings-and-sign-offs.html'
const farewellsSource = 'https://www.auckland.ac.nz/en/on-campus/life-on-campus/maori-life-on-campus/revitalising-te-reo-maori/kuputaka/greetings-and-sign-offs.html'

// Reusable course language, not word-level POS or automatic-tagging knowledge.
export const LEVEL_ONE_PHRASES = [
  { text: 'Kia ora', english: 'Hello', functionType: 'Greeting', category: 'Conversation', sourceUrl: greetingsSource },
  { text: 'Tēnā koe', english: 'Greetings to one person', functionType: 'Greeting', category: 'Conversation', sourceUrl: greetingsSource },
  { text: 'Tēnā kōrua', english: 'Greetings to two people', functionType: 'Greeting', category: 'Conversation', sourceUrl: greetingsSource },
  { text: 'Tēnā koutou katoa', english: 'Greetings to three or more people', functionType: 'Greeting', category: 'Conversation', sourceUrl: greetingsSource },
  { text: 'Ka kite anō', english: 'See you again', functionType: 'Farewell', category: 'Conversation', sourceUrl: farewellsSource },
  { text: 'Mā te wā', english: 'Until next time', functionType: 'Farewell', category: 'Conversation', sourceUrl: farewellsSource },
  ...LEVEL_ONE_CONTENT.vocabulary.filter(group => !group.title.includes('optional')).flatMap(group => group.words.filter(word => word.label.includes(' ')).map(word => ({
    text: word.label, english: word.meaning, functionType: 'Job title', category: group.title,
  }))),
]
