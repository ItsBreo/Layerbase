/**
 * Rejilla masonry estable basada en columnas flex.
 *
 * A diferencia de CSS `columns`, que rebalancea (y por tanto REORDENA) todas las
 * tarjetas cada vez que llega contenido nuevo —provocando los "saltos" al hacer
 * scroll infinito—, aquí repartimos los items por índice (round-robin) en N
 * columnas fijas. Como el reparto solo depende del índice, un item nunca cambia
 * de columna al añadirse otros al final: el layout es estable.
 *
 * El número de columnas es responsive y se recalcula solo al redimensionar.
 */
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

/** Breakpoints (px) → nº de columnas, de mayor a menor. */
const BREAKPOINTS: ReadonlyArray<{ min: number; cols: number }> = [
  { min: 1280, cols: 4 },
  { min: 1024, cols: 3 },
  { min: 640, cols: 2 },
  { min: 0, cols: 1 },
]

function columnsForWidth(width: number): number {
  return BREAKPOINTS.find((b) => width >= b.min)?.cols ?? 1
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

/** Nº de columnas actual, sincronizado con el ancho de la ventana. */
function useColumnCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => columnsForWidth(window.innerWidth),
    () => 4, // SSR/fallback (no aplica en CSR, pero evita saltos iniciales).
  )
}

export function Masonry<T>({
  items,
  getKey,
  renderItem,
  className,
}: {
  items: T[]
  getKey: (item: T) => string | number
  renderItem: (item: T) => React.ReactNode
  className?: string
}) {
  const cols = useColumnCount()
  const columns: T[][] = Array.from({ length: cols }, () => [])
  items.forEach((item, i) => columns[i % cols].push(item))

  return (
    <div className={cn('flex items-start gap-4', className)}>
      {columns.map((column, ci) => (
        <div key={ci} className="flex min-w-0 flex-1 flex-col gap-4">
          {column.map((item) => (
            <div key={getKey(item)}>{renderItem(item)}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
