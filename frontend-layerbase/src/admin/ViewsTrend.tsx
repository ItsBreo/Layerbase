/**
 * Serie diaria de visitas de los últimos N días.
 *
 * SVG a mano y no una librería de gráficas: es una única serie temporal, y
 * meter una dependencia de charts para esto pesaría más que el resto del panel.
 *
 * Decisiones de lectura:
 *  - Una sola serie ⇒ sin leyenda. El título ya dice qué se está mirando.
 *  - Rejilla y ejes recesivos: el dato manda, la escala acompaña.
 *  - Etiquetas de fecha solo en los extremos y el centro. Una por día sería
 *    ilegible y no aporta.
 *  - El backend devuelve SOLO los días con visitas; los huecos se rellenan aquí
 *    a cero, o la línea mentiría sobre la forma de la serie.
 *  - Capa de hover con guía vertical y globo: una gráfica en HTML se explora.
 *  - Tabla equivalente para lectores de pantalla, que no pueden leer el trazo.
 */
import { useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n/useI18n'

const WIDTH = 720
const HEIGHT = 180
const PAD = { top: 12, right: 8, bottom: 22, left: 8 }

interface Point {
  date: string
  value: number
}

/** Serie completa de `days` días hasta hoy, con ceros en los días sin visitas. */
function buildSeries(daily: Record<string, number>, days: number): Point[] {
  const series: Point[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    const key = day.toISOString().slice(0, 10)
    series.push({ date: key, value: daily[key] ?? 0 })
  }

  return series
}

export function ViewsTrend({
  daily,
  days,
  title,
}: {
  daily: Record<string, number>
  days: number
  title: string
}) {
  const { lang } = useI18n()
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const points = useMemo(() => buildSeries(daily, days), [daily, days])

  // El techo nunca es 0: con la serie vacía, dividir por el máximo reventaría.
  const max = Math.max(1, ...points.map((p) => p.value))

  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0

  const xOf = (i: number) => PAD.left + i * stepX
  const yOf = (v: number) => PAD.top + plotH - (v / max) * plotH

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(p.value)}`).join(' ')
  const areaPath = `${linePath} L${xOf(points.length - 1)},${PAD.top + plotH} L${xOf(0)},${PAD.top + plotH} Z`

  const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'short' })

  /** Índice del punto más cercano a la posición del puntero. */
  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || stepX === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH - PAD.left
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(x / stepX))))
  }

  const active = hover !== null ? points[hover] : null

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">{title}</span>
        {active && (
          <span className="text-sm text-text">
            <span className="font-semibold">{active.value}</span>{' '}
            <span className="text-muted">· {formatDate(active.date)}</span>
          </span>
        )}
      </figcaption>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={title}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Rejilla recesiva: tres referencias horizontales, nada más. */}
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={PAD.top + plotH * ratio}
              y2={PAD.top + plotH * ratio}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={ratio === 1 ? undefined : '3 4'}
            />
          ))}

          <path d={areaPath} fill="url(#viewsFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Guía vertical + punto activo. */}
          {active && hover !== null && (
            <>
              <line
                x1={xOf(hover)}
                x2={xOf(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--border)"
                strokeWidth="1"
              />
              {/* Aro del color de la superficie: separa el punto del trazo. */}
              <circle
                cx={xOf(hover)}
                cy={yOf(active.value)}
                r="5"
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </>
          )}

          {/* Solo tres fechas: una por día no se podría leer. */}
          {[0, Math.floor(points.length / 2), points.length - 1].map((i, position) => (
            <text
              key={i}
              x={xOf(i)}
              y={HEIGHT - 6}
              textAnchor={position === 0 ? 'start' : position === 2 ? 'end' : 'middle'}
              className="fill-muted"
              style={{ fontSize: 11 }}
            >
              {formatDate(points[i].date)}
            </text>
          ))}
        </svg>
      </div>

      {/* Equivalente textual: el trazo no lo puede leer un lector de pantalla. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{p.date}</th>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
