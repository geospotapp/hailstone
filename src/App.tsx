import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CENTER,
  PLOT_RADIUS,
  SIZE,
  START_ANGLE,
  ZOOM_FACTOR,
  ZOOM_MAX,
  ZOOM_MIN,
  clampPan,
  catmullRomPath,
  polarPoint,
  ringValue,
  zoomToward,
  type RadiusScale,
} from './hailstone'
import { SEQUENCES, parseInput, sequenceById } from './sequences'

type Pan = { x: number; y: number }

function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`hailstone:${key}`)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    localStorage.setItem(`hailstone:${key}`, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

const theme = {
  text: '#f0f0f0',
  text2: 'rgba(240, 240, 240, 0.74)',
  text3: 'rgba(240, 240, 240, 0.6)',
  fill: 'rgba(240, 240, 240, 0.14)',
  stroke: 'rgba(240, 240, 240, 0.2)',
  stroke3: 'rgba(240, 240, 240, 0.08)',
  accent: '#4d9fff',
}

const GROUPS = ['Halting maps', 'Open-ended'] as const
const DEGREE_PRESETS = [4, 7, 15, 30, 45, 60, 90]

function parseDegrees(raw: string): number {
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) return 7
  return Math.min(180, n)
}

function PolarPlot({
  sequence,
  peak,
  degrees,
  label,
  smooth,
  radiusScale,
}: {
  sequence: number[]
  peak: number
  degrees: number
  label: string
  smooth: boolean
  radiusScale: RadiusScale
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    x: number
    y: number
    panX: number
    panY: number
  } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [zoom, setZoom] = useLocalState('zoom', 1)
  const [pan, setPan] = useLocalState<Pan>('pan', { x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  useEffect(() => {
    zoomRef.current = zoom
    panRef.current = pan
  }, [zoom, pan])

  const delta = (degrees * Math.PI) / 180
  const scale = Math.max(peak, 1)
  const peakIndex = sequence.indexOf(peak)
  const points = sequence.map((value, index) => ({
    ...polarPoint(value, index, scale, delta, radiusScale),
    value,
    index,
    odd: value % 2 === 1,
  }))
  const line = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const curve = catmullRomPath(points)
  const rings = [0.25, 0.5, 0.75, 1].map((frac) => ({
    frac,
    r: frac * PLOT_RADIUS,
    label: Math.round(ringValue(frac, scale, radiusScale)).toLocaleString(),
  }))
  const hovered = hover === null ? null : points[hover]
  const start = points[0]
  const peakPt = points[peakIndex]
  const k = 1 / zoom
  const viewW = SIZE / zoom
  const viewBox = `${CENTER - viewW / 2 + pan.x} ${CENTER - viewW / 2 + pan.y} ${viewW} ${viewW}`

  function applyZoom(nextZoom: number, focusX: number, focusY: number) {
    const next = zoomToward(zoomRef.current, panRef.current, nextZoom, focusX, focusY)
    setZoom(next.zoom)
    setPan(next.pan)
  }

  function zoomBy(factor: number) {
    applyZoom(
      zoomRef.current * factor,
      CENTER + panRef.current.x,
      CENTER + panRef.current.y,
    )
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const svg = el.querySelector('svg')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const z = zoomRef.current
      const p = panRef.current
      const w = SIZE / z
      const focusX = CENTER - w / 2 + p.x + ((e.clientX - rect.left) / rect.width) * w
      const focusY = CENTER - w / 2 + p.y + ((e.clientY - rect.top) / rect.height) * w
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      const next = zoomToward(z, p, z * factor, focusX, focusY)
      setZoom(next.zoom)
      setPan(next.pan)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setZoom, setPan])

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row zoom-row">
        <button
          type="button"
          className="btn"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => zoomBy(1 / ZOOM_FACTOR)}
        >
          −
        </button>
        <span className="label" style={{ minWidth: 44 }}>
          {zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          className="btn"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => zoomBy(ZOOM_FACTOR)}
        >
          +
        </button>
        {zoom > 1 ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            Reset
          </button>
        ) : null}
        <span className="hint">Scroll to zoom · drag to pan</span>
      </div>
      <div ref={wrapRef} className="plot-wrap">
        <svg
          viewBox={viewBox}
          width="100%"
          role="img"
          aria-label={`${label} polar path, radius equals value, peak ${peak} on the rim`}
          style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
          onMouseLeave={() => {
            setHover(null)
            dragRef.current = null
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.currentTarget.setPointerCapture(e.pointerId)
            dragRef.current = {
              x: e.clientX,
              y: e.clientY,
              panX: panRef.current.x,
              panY: panRef.current.y,
            }
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current
            if (!drag) return
            const rect = e.currentTarget.getBoundingClientRect()
            const scalePx = viewW / rect.width
            setPan(
              clampPan(
                {
                  x: drag.panX - (e.clientX - drag.x) * scalePx,
                  y: drag.panY - (e.clientY - drag.y) * scalePx,
                },
                zoomRef.current,
              ),
            )
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
        >
          {rings.map((ring) => (
            <g key={ring.frac}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={ring.r}
                fill="none"
                stroke={theme.stroke3}
                strokeWidth={k}
              />
              <text
                x={CENTER + 6 * k}
                y={CENTER - ring.r - 4 * k}
                fill={theme.text3}
                fontSize={11 * k}
              >
                {ring.label}
              </text>
            </g>
          ))}
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + PLOT_RADIUS * Math.cos(START_ANGLE)}
            y2={CENTER - PLOT_RADIUS * Math.sin(START_ANGLE)}
            stroke={theme.stroke}
            strokeWidth={k}
            strokeDasharray={`${4 * k} ${4 * k}`}
          />
          {smooth ? (
            <path
              d={curve}
              fill="none"
              stroke={theme.accent}
              strokeWidth={1.5 * k}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <polyline
              points={line}
              fill="none"
              stroke={theme.accent}
              strokeWidth={1.5 * k}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {points.map((p) => (
            <circle
              key={p.index}
              cx={p.x}
              cy={p.y}
              r={(p.index === 0 ? 5.5 : p.value === 0 ? 4.5 : hover === p.index ? 5 : 3.2) * k}
              fill={p.odd ? theme.accent : theme.fill}
              stroke={p.odd ? theme.accent : theme.stroke}
              strokeWidth={k}
              onMouseEnter={() => setHover(p.index)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          <text
            x={start.x + 8 * k}
            y={start.y - 8 * k}
            fill={theme.text}
            fontSize={12 * k}
            fontWeight={590}
          >
            {start.value.toLocaleString()}
          </text>
          {peakIndex > 0 ? (
            <text
              x={peakPt.x + 8 * k}
              y={peakPt.y - 8 * k}
              fill={theme.text2}
              fontSize={11 * k}
            >
              peak {peak.toLocaleString()}
            </text>
          ) : null}
          {hovered && hovered.index !== 0 && hovered.value !== peak ? (
            <text
              x={hovered.x + 8 * k}
              y={hovered.y + 14 * k}
              fill={theme.text}
              fontSize={11 * k}
            >
              step {hovered.index}: {hovered.value.toLocaleString()}
            </text>
          ) : null}
        </svg>
      </div>
    </div>
  )
}

export default function App() {
  const [seqId, setSeqId] = useLocalState('sequence', 'collatz')
  const [inputs, setInputs] = useLocalState<Record<string, string>>('inputsBySeq', {})
  const [angle, setAngle] = useLocalState('angle', '7')
  const [smooth, setSmooth] = useLocalState('smooth', false)
  const [radiusScale, setRadiusScale] = useLocalState<RadiusScale>('radiusScale', 'linear')
  const def = sequenceById(seqId)
  const raw = inputs[seqId] ?? String(def.defaultInput)
  const n = parseInput(raw, def)
  const degrees = parseDegrees(angle)
  const run = useMemo(() => def.generate(n), [def, n])
  const sequence = run.values
  const peak = Math.max(0, ...sequence)
  const peakStep = sequence.indexOf(peak)
  const steps = Math.max(0, sequence.length - 1)

  return (
    <main className="app">
      <div className="stack" style={{ gap: 6 }}>
        <h1>{def.name}</h1>
        <p className="lede">{def.blurb}</p>
        <p className="lede">
          Radius is n or log n (your choice). The largest term sits on the rim;
          the first term is straight up, then clockwise.
        </p>
      </div>

      <div className="row controls">
        <span className="label">Sequence</span>
        <select
          className="field select-seq"
          value={seqId}
          onChange={(e) => setSeqId(e.target.value)}
          aria-label="Sequence"
        >
          {GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {SEQUENCES.filter((s) => s.group === group).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="label">{def.inputLabel}</span>
        <input
          className="field"
          value={raw}
          onChange={(e) => setInputs({ ...inputs, [seqId]: e.target.value })}
          inputMode="numeric"
          placeholder={String(def.defaultInput)}
          aria-label={def.inputLabel}
        />
        {def.examples.map((example) => (
          <button
            key={example}
            type="button"
            className={n === example ? 'pill active' : 'pill'}
            onClick={() => setInputs({ ...inputs, [seqId]: String(example) })}
          >
            {example}
          </button>
        ))}
        <span className="grow" />
        <span className="muted">Degrees per step</span>
        <input
          className="field field-deg"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          inputMode="decimal"
          placeholder="7"
          aria-label="Degrees per step"
        />
        {DEGREE_PRESETS.map((deg) => (
          <button
            key={deg}
            type="button"
            className={degrees === deg ? 'pill active' : 'pill'}
            onClick={() => setAngle(String(deg))}
          >
            {deg}°
          </button>
        ))}
        <button
          type="button"
          className={smooth ? 'pill active' : 'pill'}
          onClick={() => setSmooth(!smooth)}
        >
          Smooth curve
        </button>
        <span className="muted">Radius</span>
        <button
          type="button"
          className={radiusScale === 'linear' ? 'pill active' : 'pill'}
          onClick={() => setRadiusScale('linear')}
        >
          n
        </button>
        <button
          type="button"
          className={radiusScale === 'log' ? 'pill active' : 'pill'}
          onClick={() => setRadiusScale('log')}
        >
          log n
        </button>
      </div>

      <div className="stats">
        <div>
          <div className="stat-value">{n.toLocaleString()}</div>
          <div className="stat-label">{def.inputLabel}</div>
        </div>
        <div>
          <div className="stat-value">{steps}</div>
          <div className="stat-label">{def.kind === 'count' ? 'Terms after first' : 'Steps'}</div>
        </div>
        <div>
          <div className="stat-value">{peak.toLocaleString()}</div>
          <div className="stat-label">Peak (rim)</div>
        </div>
        <div>
          <div className="stat-value">{run.halt}</div>
          <div className="stat-label">Halt</div>
        </div>
      </div>

      <section className="stack" style={{ gap: 8 }}>
        <h2>Polar path — radius = {radiusScale === 'log' ? 'log n' : 'n'}</h2>
        <div className="row legend">
          <span className="row legend-item">
            <span className="dot odd" />
            Odd
          </span>
          <span className="row legend-item">
            <span className="dot even" />
            Even
          </span>
          <span className="hint">Dashed ray is the starting angle</span>
        </div>
        <PolarPlot
          sequence={sequence}
          peak={peak}
          degrees={degrees}
          label={def.name}
          smooth={smooth}
          radiusScale={radiusScale}
        />
        <p className="caption">
          {def.caption}
          {` · radius ${radiusScale === 'log' ? 'log n' : 'n'}`}
          {run.truncated ? ` · truncated (${run.halt})` : ` · ${run.halt}`}
          {peakStep > 0 ? ` · peak at step ${peakStep}` : ''}
        </p>
      </section>

      <details className="sequence">
        <summary>
          <span>Terms</span>
          <span className="muted">{sequence.length} values</span>
        </summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="num">Step</th>
                <th className="num">n</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              {sequence.map((value, i) => (
                <tr key={i}>
                  <td className="num">{i}</td>
                  <td className="num">{value.toLocaleString()}</td>
                  <td>{run.rules[i] ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </main>
  )
}
