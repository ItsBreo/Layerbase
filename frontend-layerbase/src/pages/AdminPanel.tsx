/**
 * Panel de administración — cola de moderación. Protegido por <AdminRoute>:
 * solo usuarios con rol 'admin' llegan aquí (y el backend lo revalida con
 * `role:admin` + la policy `moderate`).
 *
 * Es la pieza que cierra el ciclo de publicación: `submit` lo ejecuta el autor,
 * pero aprobar es lo ÚNICO que lleva un componente a `published` y, por tanto,
 * al marketplace. Sin esta pantalla el catálogo público se queda vacío.
 *
 * La cola se ordena por antigüedad (lo decide el backend), no por novedad: una
 * bandeja de revisión se atiende por orden de llegada.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Inbox, ShieldCheck, SquareArrowOutUpRight, X } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Button } from '@/components/ui/Button'
import { PriceBadge, StatusBadge, Tag } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdminNav } from '@/admin/AdminNav'
import { useI18n } from '@/i18n/useI18n'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApproveComponent, useModerationCounts, useModerationQueue } from '@/studio/hooks'
import { RejectDialog } from '@/studio/RejectDialog'
import { COMPONENT_STATUSES, type Component, type ComponentStatus } from '@/studio/types'

export default function AdminPanel() {
  const { t } = useI18n()
  const [status, setStatus] = useState<ComponentStatus>('pending_review')
  const { data, isLoading, isPlaceholderData } = useModerationQueue(status)
  const { data: counts } = useModerationCounts()

  const items = data?.data ?? []

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/60 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-accent backdrop-blur">
            <ShieldCheck className="size-3.5" />
            {t('admin.badge')}
          </div>
          <AccentedTitle text={t('admin.title')} className="mt-4 text-4xl" />
          <p className="mt-3 max-w-xl text-muted">{t('admin.body')}</p>
        </motion.div>

        <AdminNav />

        {/* Pestañas por estado, con el contador al lado. Los contadores llegan
            de una sola query agregada, no de una petición por pestaña. */}
        <div className="mt-6 flex flex-wrap gap-2">
          {COMPONENT_STATUSES.map((s) => (
            <StatusTab
              key={s}
              active={status === s}
              count={counts?.[s]}
              onClick={() => setStatus(s)}
            >
              {t(`studio.status.${s}`)}
            </StatusTab>
          ))}
        </div>

        {/* `keepPreviousData` mantiene la lista mientras llega la nueva página:
            se atenúa en vez de parpadear a skeleton. */}
        <div className={cn('mt-6 space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
          {isLoading ? (
            <QueueSkeleton />
          ) : items.length === 0 ? (
            <EmptyQueue pending={status === 'pending_review'} />
          ) : (
            items.map((component) => <QueueRow key={component.id} component={component} />)
          )}
        </div>
      </main>
    </AppShell>
  )
}

function StatusTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count?: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-xs font-medium transition',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-muted hover:border-accent/40 hover:text-text',
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-pill px-1.5 font-mono text-[0.65rem]',
            active ? 'bg-accent/15' : 'bg-border/50',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/**
 * Fila de la cola. Muestra lo justo para decidir sin abrir la ficha (título,
 * autor, categoría, stack, precio y antigüedad) y deja el enlace a la ficha
 * completa para cuando haga falta mirar el código.
 */
function QueueRow({ component }: { component: Component }) {
  const { t, lang } = useI18n()
  const approve = useApproveComponent()
  const [rejecting, setRejecting] = useState(false)

  // Solo lo que está esperando revisión se puede resolver; en el resto de
  // pestañas la fila es de consulta. El backend rechaza igualmente cualquier
  // transición ilegal con un 422.
  const canModerate = component.status === 'pending_review'

  return (
    <div className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-navy-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-semibold text-text">{component.title}</span>
            <StatusBadge status={component.status} />
            <PriceBadge price={component.price} isFree={component.is_free} />
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-muted">{component.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
            {component.author && (
              <span>
                {t('admin.queue.by')}{' '}
                {/* Los nombres de usuario van SIEMPRE en Syne (identidad de marca). */}
                <span className="font-display font-semibold text-text">
                  {component.author.name}
                </span>
              </span>
            )}
            <span>{t(`studio.stack.${component.stack}`)}</span>
            {component.category && <span>{component.category.name}</span>}
            <span>{t('admin.queue.submitted', { date: timeAgo(component.updated_at, lang) })}</span>
          </div>

          {component.tags && component.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {component.tags.map((tag) => (
                <Tag key={tag.id}>{tag.name}</Tag>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Link to={`/components/${component.slug}`} target="_blank" rel="noreferrer">
            <Button
              variant="ghost"
              size="sm"
              icon={<SquareArrowOutUpRight className="size-3.5" />}
            >
              {t('admin.actions.review')}
            </Button>
          </Link>
          {canModerate && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejecting(true)}
                icon={<X className="size-3.5 text-danger" />}
              >
                {t('admin.actions.reject')}
              </Button>
              <Button
                size="sm"
                loading={approve.isPending}
                onClick={() => approve.mutate(component.slug)}
                icon={<Check className="size-3.5" />}
              >
                {t('admin.actions.approve')}
              </Button>
            </>
          )}
        </div>
      </div>

      <RejectDialog open={rejecting} onOpenChange={setRejecting} component={component} />
    </div>
  )
}

function EmptyQueue({ pending }: { pending: boolean }) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
      <Inbox className="mx-auto size-8 text-muted" />
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted">
        {pending ? t('admin.queue.empty') : t('admin.queue.emptyFiltered')}
      </p>
    </div>
  )
}

function QueueSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </>
  )
}
