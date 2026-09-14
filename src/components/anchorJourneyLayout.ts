type AnchorSlot = { prefixWidth: number; adjectiveWidth: number; markerWidth: number }

/** Position the keyword group separately from the space its later attachments need. */
export function anchorJourneyLayout(slots: readonly AnchorSlot[], expansion: number) {
  const anchorWidth = 130
  const sentenceGap = 28
  const keywordGap = 56
  const width = slots.reduce((sum, slot) => sum + anchorWidth + slot.prefixWidth + slot.adjectiveWidth + slot.markerWidth, 0)
    + Math.max(0, slots.length - 1) * sentenceGap
  const keywordWidth = slots.length * anchorWidth + Math.max(0, slots.length - 1) * keywordGap
  const start = (width - keywordWidth) / 2
  let cursor = 0
  const offsets = slots.map((slot, index) => {
    const finalAnchorLeft = cursor + slot.markerWidth + slot.prefixWidth
    const keywordLeft = start + index * (anchorWidth + keywordGap)
    cursor += anchorWidth + slot.prefixWidth + slot.adjectiveWidth + slot.markerWidth + sentenceGap
    return (keywordLeft - finalAnchorLeft) * (1 - Math.max(0, Math.min(1, expansion)))
  })
  return { width, offsets }
}
