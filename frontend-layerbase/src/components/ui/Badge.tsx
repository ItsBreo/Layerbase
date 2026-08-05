/**
 * Badges del design system.
 *
 * - StatusBadge: estado de moderación (5 estados), con color semántico.
 * - PriceBadge: precio con la regla de identidad de marca — el VERDE señala
 *   "Gratis"/open source y el AZUL acento señala pago. El color cuenta el
 *   modelo de negocio sin escribirlo.
 */
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/useI18n'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ComponentStatus } from '@/studio/types'

const base =
  'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 font-mono text-xs font-medium'

/**
 * Pill neutral de marca (tags, stack) — mismo `base` que los demás badges para
 * que TODAS las pills compartan diseño (radio, padding, tipografía). Antes cada
 * vista pintaba su propia píldora navy con estilos ligeramente distintos.
 */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(base, 'bg-navy-50 text-navy', className)}>{children}</span>
}

const STATUS_STYLES: Record<ComponentStatus, string> = {
  draft: 'bg-navy-50 text-navy',
  pending_review: 'bg-warning/10 text-warning',
  published: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  unpublished: 'border border-border bg-bg text-muted',
}

export function StatusBadge({ status, className }: { status: ComponentStatus; className?: string }) {
  const { t } = useI18n()
  return (
    <span className={cn(base, STATUS_STYLES[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(`studio.status.${status}`)}
    </span>
  )
}

export function PriceBadge({
  price,
  isFree,
  className,
}: {
  price: string | number
  isFree: boolean
  className?: string
}) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        base,
        isFree ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent',
        className,
      )}
    >
      {isFree ? t('studio.price.free') : formatPrice(price)}
    </span>
  )
}
