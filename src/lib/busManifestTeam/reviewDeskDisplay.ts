/** Source text for the review desk. All decisions come from the saved sheet. */
export type BusManifestDisplayToken = {
  readonly text: string
}

function emptyDisplayToken(text: string): BusManifestDisplayToken {
  return { text }
}

/** Tokenize canonical passage text for the Review Desk display. */
export function renderUnassessedPassage(text: string): readonly BusManifestDisplayToken[] {
  return text.trim().split(/\s+/u).filter(Boolean).map(emptyDisplayToken)
}
