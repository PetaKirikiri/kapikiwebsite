/** The equation sources emit absolute polygon paths. Reject unsupported SVG commands
 * before transforming, instead of quietly leaving curves at their old coordinates.
 */
export function assertLinearPath(path: string): void {
  const number = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?'
  const point = `[ML]\\s*${number}[\\s,]+${number}`
  if (!new RegExp(`^\\s*M\\s*${number}[\\s,]+${number}(?:\\s*(?:${point}|Z))*\\s*$`, 'u').test(path)) {
    throw new Error('This transform requires an absolute M/L/Z polygon path. Convert curves before transforming.')
  }
  for (const token of path.match(new RegExp(number, 'gu')) ?? []) {
    if (!Number.isFinite(Number(token))) throw new Error('Path coordinates must be finite.')
  }
}

export function mapLinearPath(path: string, transform: (x: number, y: number) => readonly [number | string, number | string]): string {
  assertLinearPath(path)
  return path.replace(/([ML])\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[\s,]+([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/gu,
    (_, command: string, x: string, y: string) => {
      const [nextX, nextY] = transform(Number(x), Number(y))
      if (!Number.isFinite(Number(nextX)) || !Number.isFinite(Number(nextY))) throw new Error('Transformed coordinates must be finite.')
      return `${command}${nextX} ${nextY}`
    })
}
