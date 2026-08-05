/** Utilidades de formato compartidas. */

/** Formatea un precio DECIMAL (string o number) a euros con coma decimal. */
export function formatPrice(price: string | number): string {
  const value = typeof price === 'string' ? Number.parseFloat(price) : price
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(value) ? value : 0,
  )
}

const TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

/**
 * Tiempo relativo legible ("hace 2 horas" / "2 hours ago") vía Intl, sin
 * dependencias. `locale` en formato BCP-47 ('es', 'en'). Fechas nulas → ''.
 */
export function timeAgo(iso: string | null | undefined, locale = 'es'): string {
  if (!iso) return ''
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, secondsInUnit] of TIME_UNITS) {
    if (Math.abs(seconds) >= secondsInUnit || unit === 'second') {
      return rtf.format(Math.round(seconds / secondsInUnit), unit)
    }
  }
  return ''
}
