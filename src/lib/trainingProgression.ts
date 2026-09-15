import type { WebsitePreviewSentence } from '../components/WebsiteView'

function courseOrder(a: WebsitePreviewSentence, b: WebsitePreviewSentence) {
  return (a.curriculumLevel ?? 7) - (b.curriculumLevel ?? 7) || a.sortOrder - b.sortOrder
}

export function trainingExamples(sentences: readonly WebsitePreviewSentence[]) {
  return sentences.flatMap(sentence => {
    if (!sentence.training) return []
    return [{ sentence: { ...sentence, training: { ...sentence.training, questionId: `structure:${sentence.structureId}` } }, meaning: sentence.training.correct }, ...(sentence.training.variants ?? []).map(variant => ({ sentence: { ...sentence, textMi: variant.textMi, state: null, training: { ...variant, active: sentence.training!.active } }, meaning: variant.correct }))]
  }).sort((a, b) => courseOrder(a.sentence, b.sentence))
}

export function trainingAlternative(examples: ReturnType<typeof trainingExamples>, index: number) {
  const current = examples[index]
  if (!current) return undefined
  const entry = current.sentence.training
  if (!entry || entry.correct !== current.meaning || entry.alternative === entry.correct) return undefined
  return { meaning: entry.alternative }
}

export function contentProgression(sentences: readonly WebsitePreviewSentence[]) {
  return [...sentences].sort(courseOrder).flatMap(sentence => {
    const examples = trainingExamples([sentence])
    const rows: WebsitePreviewSentence[] = examples.length ? examples.map(item => item.sentence) : [sentence]
    return rows.map(sentence => ({ sentence, meaning: sentence.training?.correct ?? null, alternative: sentence.training?.alternative ?? null, active: sentence.training?.active === true && sentence.training.correct !== sentence.training.alternative }))
  })
}
