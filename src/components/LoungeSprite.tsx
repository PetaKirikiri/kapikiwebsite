import { useEffect, useRef, useState } from 'react'

let source: Promise<HTMLImageElement> | undefined
function loadSource() {
  return source ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => { source = undefined; reject(new Error('Sprite atlas unavailable')) }
    image.src = '/classroom/lounge-walk-v1.png'
  })
}
type Frame = { x: number; y: number; width: number; height: number }
export default function LoungeSprite({ player, color, look }: {
  player: { walking: boolean; stride: number; direction: 'front' | 'back' | 'side'; facing: number }
  color: string; look: 'male' | 'female'
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [sheet, setSheet] = useState<{ canvas: HTMLCanvasElement; frames: Frame[]; height: number } | null>(null)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(preference.matches)
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    let cancelled = false
    loadSource().then(image => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
      for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2]
        // Chroma-key the authored sprite sheet at load time, not on each frame.
        if (g > 100 && g > r * 1.6 && g > b * 1.6) { pixels.data[i + 3] = 0; continue }
        if (b > r * 1.25 && g > r * 1.1 && pixels.data[i + 3]) {
          for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.min(255, rgb[c] * b / 150)
        }
      }
      ctx.putImageData(pixels, 0, 0)
      const frames: Frame[] = []
      for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) {
        const x0 = Math.floor(col * image.width / 4), y0 = Math.floor(row * image.height / 6)
        const x1 = Math.floor((col + 1) * image.width / 4), y1 = Math.floor((row + 1) * image.height / 6)
        let left = x1, top = y1, right = x0, bottom = y0
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          if (pixels.data[(y * image.width + x) * 4 + 3] > 100) {
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
          }
        }
        frames.push({ x: left, y: top, width: Math.max(1, right - left + 1), height: Math.max(1, bottom - top + 1) })
      }
      setSheet({ canvas, frames, height: Math.max(...frames.map(frame => frame.height)) })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [color])
  const row = (look === 'female' ? 3 : 0) + (player.direction === 'front' ? 0 : player.direction === 'side' ? 1 : 2)
  const frame = player.walking && !reduced ? Math.floor(player.stride * 2) % 4 : 0
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || !sheet) return
    const box = sheet.frames[row * 4 + frame]
    const scale = 156 / sheet.height
    ctx.clearRect(0, 0, 96, 160)
    ctx.imageSmoothingEnabled = false
    ctx.save()
    if (player.direction === 'side' && player.facing < 0) { ctx.translate(96, 0); ctx.scale(-1, 1) }
    ctx.drawImage(sheet.canvas, box.x, box.y, box.width, box.height, (96 - box.width * scale) / 2, 160 - box.height * scale, box.width * scale, box.height * scale)
    ctx.restore()
  }, [sheet, row, frame, player.direction, player.facing])
  return <canvas ref={ref} width={96} height={160} className="room-player-sprite" aria-hidden="true" />
}
