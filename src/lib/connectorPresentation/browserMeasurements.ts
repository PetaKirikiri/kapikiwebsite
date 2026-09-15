type ClientBox = { left: number; top: number; width: number }

/** Convert viewport measurements back to the CSS pixels used by the shared layout. */
export function sentenceMeasurementFrame(paragraph: ClientBox, layoutWidth: number) {
  const scale = layoutWidth > 0 && paragraph.width > 0 ? paragraph.width / layoutWidth : 1
  return {
    width: paragraph.width / scale,
    local: (box: ClientBox) => ({
      left: (box.left - paragraph.left) / scale,
      top: (box.top - paragraph.top) / scale,
      width: box.width / scale,
    }),
  }
}
