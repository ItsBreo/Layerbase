/**
 * Bloque de carga (skeleton) del design system. Placeholder gris con pulso,
 * decorativo (`aria-hidden`). Compón varios para reconstruir el layout que se
 * está cargando (ver `GridSkeleton`, `ComponentDetailSkeleton`, etc.).
 */
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden style={style} className={cn('animate-pulse rounded-md bg-border/60', className)} />
  )
}
