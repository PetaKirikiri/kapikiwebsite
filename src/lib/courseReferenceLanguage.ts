// Teaching examples only. These do not assign dictionary senses, POS or engine rules.
const pronounSource = 'https://kupu.maori.nz/extra/pronouns'
const possessionSource = 'https://kupu.maori.nz/possession/t-possession'
export const PRONOUN_PROGRESSION = [
  { level: 1, words: ['au', 'ahau', 'koe', 'ia'] },
  { level: 2, words: ['māua', 'tāua', 'kōrua', 'rāua'] },
  { level: 3, words: ['mātou', 'tātou', 'koutou', 'rātou'] },
] as const

export const PRONOUN_EXAMPLES: Record<string, readonly [string, string]> = {
  au: ['He kaiako au.', 'I am a teacher.'],
  ahau: ['Nō Rotorua ahau.', 'I am from Rotorua.'],
  koe: ['He kaiako koe.', 'You are a teacher.'],
  ia: ['Nō Pōneke ia.', 'He or she is from Wellington.'],
  māua: ['Ka hoki māua ki te kāinga.', 'We two will go home, not including you.'],
  tāua: ['Me kai tāua i te parāoa.', 'You and I should eat some bread.'],
  kōrua: ['Me haere kōrua ki te kura.', 'You two should go to school.'],
  rāua: ['Kei te kai rāua i te parāoa.', 'Those two are eating bread.'],
  mātou: ['Ka hoki mātou ki te kāinga.', 'We will go home, three or more of us, not including you.'],
  tātou: ['Me tiaki tātou i te kura.', 'We should all look after the school, including you.'],
  koutou: ['Kaua e oma koutou.', 'Do not run, all of you.'],
  rātou: ['Kāore rātou i kite i te waea.', 'They did not find the phone, three or more people.'],
}

export function pronounSupport(word: string) {
  const example = PRONOUN_EXAMPLES[word]
  return example ? { example, sourceUrl: pronounSource } : {}
}

const owners = [
  ['māua', 'our (two people, excluding you)'], ['tāua', 'our (you and me)'],
  ['kōrua', 'your (two people)'], ['rāua', 'their (two people)'],
  ['mātou', 'our (three or more, excluding you)'], ['tātou', 'our (three or more, including you)'],
  ['koutou', 'your (three or more people)'], ['rātou', 'their (three or more people)'],
] as const
const possessives = [
  ['tā', 'one possession, a category'], ['tō', 'one possession, o category'],
  ['ā', 'more than one possession, a category'], ['ō', 'more than one possession, o category'],
] as const

// Whole constructions, not 32 extra distinct vocabulary words.
export const SHARED_POSSESSIVES = owners.flatMap(([owner, meaning]) => possessives.map(([prefix, scope]) => ({
  id: `reference:${prefix}-${owner}`,
  kind: 'phrase' as const,
  text: `${prefix} ${owner}`,
  english: `${meaning}; ${scope}`,
  components: [prefix, owner],
  category: 'Shared possession',
  sourceUrl: possessionSource,
})))
