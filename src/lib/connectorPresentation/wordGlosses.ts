/** Authored teaching glosses preserve Māori order. These are contextual
 * explanations, not natural-English translations or POS/tagging evidence. */
const glosses: Readonly<Record<string, readonly string[]>> = {
  'Ko wai tō matua?': ['is', 'who', 'your', 'father'],
  'Ko wai tō whaea?': ['is', 'who', 'your', 'mother'],
  'Nō hea tō matua?': ['from', 'where', 'your', 'father'],
  'Nō hea tō whaea?': ['from', 'where', 'your', 'mother'],
  'He aha tō matua?': ['a', 'what', 'your', 'father'],
  'He aha tō whaea?': ['a', 'what', 'your', 'mother'],
  'Kei hea tō matua?': ['at', 'where', 'your', 'father'],
  'Kei hea tō whaea?': ['at', 'where', 'your', 'mother'],
  'Tokohia ō tamariki?': ['how many people', 'your', 'children'],
  'E hia ngā rā o te wiki?': ['', 'how many', 'the', 'days', 'of', 'the', 'week'],
}
export function sentenceWordGlosses(text: string, wordCount: number) {
  const entry = glosses[text]
  return entry?.length === wordCount ? entry : null
}
