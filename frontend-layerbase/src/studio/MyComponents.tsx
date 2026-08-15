/**
 * #17 Mis componentes — panel de gestión del autor (GET /components/my).
 *
 * Lista con badge de estado, filtro por estado y acciones rápidas contextuales
 * (editar, enviar a revisión, despublicar, eliminar). Es la pantalla que el
 * autor más usa.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Package, Pencil, Plus, RotateCcw, Send, Trash2, Undo2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PriceBadge, StatusBadge } from '@/components/ui/Badge'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import {
  useDeleteComponent,
  useMyComponents,
  useRevertComponent,
  useSubmitComponent,
  useUnpublishComponent,
} from '@/studio/hooks'
import { COMPONENT_STATUSES, type Component, type ComponentStatus } from '@/studio/types'

export default function MyComponents() {
  const { t } = useI18n()
  const [status, setStatus] = useState<ComponentStatus | undefined>(undefined)
  const { data, isLoading, isPlaceholderData } = useMyComponents(status)

  const items = data?.data ?? []

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Cabecera */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              {t('studio.list.eyebrow')}
            </p>
            <AccentedTitle text={t('studio.list.title')} className="mt-2 text-4xl" />
            <p className="mt-2 text-muted">{t('studio.list.subtitle')}</p>
          </div>
          <Link to="/studio/new">
            <Button icon={<Plus className="size-4" />}>{t('studio.list.new')}</Button>
          </Link>
        </motion.div>

        {/* Filtro por estado */}
        <div className="mt-8 flex flex-wrap gap-2">
          <StatusFilterChip active={status === undefined} onClick={() => setStatus(undefined)}>
            {t('studio.list.filterAll')}
          </StatusFilterChip>
          {COMPONENT_STATUSES.map((s) => (
            <StatusFilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {t(`studio.status.${s}`)}
            </StatusFilterChip>
          ))}
        </div>

        {/* Lista. Al cambiar de filtro `keepPreviousData` mantiene la lista y
            solo la atenuamos mientras llega la nueva (sin parpadeo a skeleton). */}
        <div
          className={cn(
            'mt-6 space-y-3 transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {isLoading ? (
            <ListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState filtered={status !== undefined} />
          ) : (
            items.map((component) => (
              <ComponentRow key={component.id} component={component} />
            ))
          )}
        </div>
      </main>
    </AppShell>
  )
}

function StatusFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // min-w + centrado: al traducir el texto el chip no cambia de ancho ni
        // reordena la fila de filtros.
        'inline-flex min-w-[5.5rem] items-center justify-center rounded-pill border px-3 py-1 text-xs font-medium transition',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-muted hover:border-accent/40 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

function ComponentRow({ component }: { component: Component }) {
  const { t } = useI18n()
  const submit = useSubmitComponent()
  const revert = useRevertComponent()
  const unpublish = useUnpublishComponent()
  const remove = useDeleteComponent()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)

  const canEdit = component.status === 'draft' || component.status === 'rejected'
  // `submit` SOLO es legal desde borrador. Desde `rejected` hay que pasar por
  // `revert` primero, o el backend responde 422.
  const canSubmit = component.status === 'draft'
  const canRevert = component.status === 'rejected' || component.status === 'unpublished'
  const canUnpublish = component.status === 'published'

  return (
    <div className="group relative rounded-lg border border-border bg-surface p-4 transition-colors hover:border-navy-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Stretched link: cubre toda la tarjeta (::after) para que se pueda
                pulsar en cualquier zona; las acciones van con z-10 por encima. */}
            <Link
              to={`/studio/${component.slug}`}
              className="truncate text-base font-semibold text-text transition-colors after:absolute after:inset-0 group-hover:text-accent"
            >
              {component.title}
            </Link>
            <StatusBadge status={component.status} />
            <PriceBadge price={component.price} isFree={component.is_free} />
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted">{component.description}</p>
          <div className="mt-2 flex items-center gap-4 font-mono text-xs text-muted">
            <span>{t(`studio.stack.${component.stack}`)}</span>
            <span className="inline-flex items-center gap-1">
              <Download className="size-3" />
              {component.downloads}
            </span>
          </div>
        </div>

        {/* Acciones rápidas (relative + z-10: por encima del stretched link) */}
        <div className="relative z-10 flex shrink-0 items-center gap-1.5">
          {canSubmit && (
            <Button
              variant="secondary"
              size="sm"
              loading={submit.isPending}
              onClick={() => submit.mutate(component.slug)}
              icon={<Send className="size-3.5" />}
            >
              {t('studio.actions.submit')}
            </Button>
          )}
          {canRevert && (
            <Button
              variant="secondary"
              size="sm"
              loading={revert.isPending}
              onClick={() => revert.mutate(component.slug)}
              icon={<RotateCcw className="size-3.5" />}
            >
              {t('studio.actions.revert')}
            </Button>
          )}
          {canEdit && (
            <Link to={`/studio/${component.slug}/edit`}>
              <Button variant="ghost" size="sm" icon={<Pencil className="size-3.5" />}>
                {t('studio.actions.edit')}
              </Button>
            </Link>
          )}
          {canUnpublish && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmUnpublish(true)}
              icon={<Undo2 className="size-3.5" />}
            >
              {t('studio.actions.unpublish')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('studio.actions.delete')}
            onClick={() => setConfirmDelete(true)}
            icon={<Trash2 className="size-3.5 text-danger" />}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('studio.confirm.deleteTitle')}
        description={t('studio.confirm.deleteBody')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate(component.slug, { onSettled: () => setConfirmDelete(false) })}
      />
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title={t('studio.confirm.unpublishTitle')}
        description={t('studio.confirm.unpublishBody')}
        confirmVariant="danger"
        loading={unpublish.isPending}
        onConfirm={() =>
          unpublish.mutate(component.slug, { onSettled: () => setConfirmUnpublish(false) })
        }
      />
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
      <Package className="mx-auto size-8 text-muted" />
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted">
        {filtered ? t('studio.list.emptyFiltered') : t('studio.list.empty')}
      </p>
      {!filtered && (
        <Link to="/studio/new" className="mt-5 inline-block">
          <Button icon={<Plus className="size-4" />}>{t('studio.list.new')}</Button>
        </Link>
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </>
  )
}
