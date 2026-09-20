export const START_ANGLE = Math.PI / 2
export const SIZE = 720
export const CENTER = SIZE / 2
export const PLOT_RADIUS = 300
export const MAX_START = 1_000_000_000_000
export const MAX_STEPS = 2_000
export const ZOOM_MIN = 1
export const ZOOM_MAX = 16
export const ZOOM_FACTOR = 1.45

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function maxPanFor(zoom: number) {
  return (SIZE / 2) * (1 - 1 / zoom)
}

export function clampPan(pan: { x: number; y: number }, zoom: number) {
  if (zoom <= 1) return { x: 0, y: 0 }
  const limit = maxPanFor(zoom)
  return {
    x: clamp(pan.x, -limit, limit),
    y: clamp(pan.y, -limit, limit),
  }
}

export function zoomToward(
  zoom: number,
  pan: { x: number; y: number },
  nextZoom: number,
  focusX: number,
  focusY: number,
) {
  const z2 = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX)
  const w1 = SIZE / zoom
  const w2 = SIZE / z2
  const originX = CENTER - w1 / 2 + pan.x
  const originY = CENTER - w1 / 2 + pan.y
  const tx = (focusX - originX) / w1
  const ty = (focusY - originY) / w1
  return {
    zoom: z2,
    pan: clampPan(
      {
        x: focusX - CENTER + w2 / 2 - tx * w2,
        y: focusY - CENTER + w2 / 2 - ty * w2,
      },
      z2,
    ),
  }
}

export type RadiusScale = 'linear' | 'log'

export function radiusOf(value: number, peak: number, scale: RadiusScale): number {
  if (peak <= 0) return 0
  if (scale === 'linear') return (Math.max(value, 0) / peak) * PLOT_RADIUS
  if (value <= 1 || peak <= 1) return 0
  return (Math.log(value) / Math.log(peak)) * PLOT_RADIUS
}

export function ringValue(frac: number, peak: number, scale: RadiusScale): number {
  if (scale === 'log') {
    if (peak <= 1) return frac * Math.max(peak, 0)
    return peak ** frac
  }
  return frac * Math.max(peak, 0)
}

export function polarPoint(
  value: number,
  index: number,
  peak: number,
  delta: number,
  scale: RadiusScale = 'linear',
) {
  const r = radiusOf(value, peak, scale)
  const theta = START_ANGLE - index * delta
  return {
    x: CENTER + r * Math.cos(theta),
    y: CENTER - r * Math.sin(theta),
  }
}

export function catmullRomPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const fmt = (n: number) => n.toFixed(2)
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`
  if (points.length === 2) {
    return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[1].x)} ${fmt(points[1].y)}`
  }
  const pts = [points[0], ...points, points[points.length - 1]]
  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2]
    d += ` C ${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)} ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)} ${fmt(p2.x)} ${fmt(p2.y)}`
  }
  return d
}
