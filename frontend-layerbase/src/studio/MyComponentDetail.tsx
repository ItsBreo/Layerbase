/**
 * #21 Vista de componente propio — detalle estándar + panel PRIVADO del autor
 * con métricas (descargas exactas, ingresos, valoración) y estado de moderación.
 *
 * Ingresos aún no se calculan en el backend (módulo de compras, semana
 * posterior): se muestran a 0 con una nota, para no inventar cifras.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Gift,
  Pencil,
  Send,
  Star,
  Trash2,
  TrendingUp,
  Undo2,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PriceBadge, StatusBadge, Tag } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { getErrorMessage } from '@/lib/api'
import { fadeUpItem, staggerContainer } from '@/lib/motion'
import { formatPrice } from '@/lib/format'
import { useI18n } from '@/i18n/useI18n'
import { componentsApi } from '@/studio/api'
import {
  useComponent,
  useDeleteComponent,
  useSubmitComponent,
  useUnpublishComponent,
} from '@/studio/hooks'
import { toast } from 'sonner'
import type { ReactNode } from 'react'

export default function MyComponentDetail() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { data: component, isLoading } = useComponent(slug)

  const submit = useSubmitComponent()
  const unpublish = useUnpublishComponent()
  const remove = useDeleteComponent()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (isLoading) {
    return (
      <AppShell>
        <MyComponentDetailSkeleton />
      </AppShell>
    )
  }

  if (!component) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center text-muted">
          <p>404</p>
          <Link to="/studio" className="mt-3 inline-block text-accent hover:underline">
            {t('studio.list.title')}
          </Link>
        </div>
      </AppShell>
    )
  }

  const canEdit = component.status === 'draft' || component.status === 'rejected'
  const canUnpublish = component.status === 'published'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { url } = await componentsApi.download(component.slug)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setDownloading(false)
    }
  }

  const rating = component.rating_avg ? Number.parseFloat(component.rating_avg) : null

  return (
    <AppShell>
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl px-6 py-12"
      >
        <motion.button
          variants={fadeUpItem}
          type="button"
          onClick={() => navigate('/studio')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text"
        >
          <ArrowLeft className="size-4" />
          {t('studio.list.title')}
        </motion.button>

        <motion.div variants={fadeUpItem}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl">{component.title}</h1>
            <StatusBadge status={component.status} />
            <PriceBadge price={component.price} isFree={component.is_free} />
          </div>
          <p className="mt-3 max-w-2xl text-muted">{component.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
            <span>{t(`studio.stack.${component.stack}`)}</span>
            {component.category && <span>· {component.category.name}</span>}
            {component.tags?.map((tag) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </div>
        </motion.div>

        {/* Acciones */}
        <motion.div variants={fadeUpItem} className="mt-6 flex flex-wrap gap-2">
          {canEdit && (
            <Link to={`/studio/${component.slug}/edit`}>
              <Button variant="secondary" size="sm" icon={<Pencil className="size-3.5" />}>
                {t('studio.actions.edit')}
              </Button>
            </Link>
          )}
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              loading={submit.isPending}
              onClick={() => submit.mutate(component.slug)}
              icon={<Send className="size-3.5" />}
            >
              {t('studio.actions.submit')}
            </Button>
          )}
          {component.stack === 'react' && (
            <Link to={`/studio/${component.slug}/preview`}>
              <Button variant="ghost" size="sm" icon={<Eye className="size-3.5" />}>
                {t('studio.actions.preview')}
              </Button>
            </Link>
          )}
          {component.has_source && component.can_download_source && (
            <Button
              variant="ghost"
              size="sm"
              loading={downloading}
              onClick={handleDownload}
              icon={<Download className="size-3.5" />}
            >
              {t('studio.actions.download')}
            </Button>
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
            onClick={() => setConfirmDelete(true)}
            icon={<Trash2 className="size-3.5 text-danger" />}
          >
            {t('studio.actions.delete')}
          </Button>
        </motion.div>

        {/* Panel privado */}
        <motion.section variants={fadeUpItem} className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {t('studio.detail.privatePanel')}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Metric icon={<Download className="size-4" />} label={t('studio.detail.downloads')}>
              {component.downloads}
            </Metric>
            {component.is_free ? (
              <Metric
                icon={<Gift className="size-4" />}
                label={t('studio.detail.model')}
                hint={t('studio.detail.freeHint')}
              >
                <span className="text-success">{t('studio.detail.freeModel')}</span>
              </Metric>
            ) : (
              <Metric
                icon={<TrendingUp className="size-4" />}
                label={t('studio.detail.revenue')}
                hint="Pendiente del módulo de compras"
              >
                {formatPrice(0)}
              </Metric>
            )}
            <Metric icon={<Star className="size-4" />} label={t('studio.detail.rating')}>
              {rating !== null ? (
                <span>
                  {rating.toFixed(2)}{' '}
                  <span className="text-sm text-muted">({component.rating_count})</span>
                </span>
              ) : (
                <span className="text-base text-muted">{t('studio.detail.noRating')}</span>
              )}
            </Metric>
          </div>
        </motion.section>

        {/* Archivos públicos (readme/preview) */}
        {component.files && component.files.length > 0 && (
          <motion.section variants={fadeUpItem} className="mt-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              {t('studio.form.sectionFiles')}
            </h2>
            <div className="mt-3 space-y-2">
              {component.files.map((file) => (
                <a
                  key={file.type}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text transition hover:border-accent"
                >
                  <FileText className="size-4 text-muted" />
                  <span className="font-medium">{file.filename}</span>
                  <span className="ml-auto font-mono text-xs text-muted">
                    {(file.size_bytes / 1024).toFixed(0)} KB
                  </span>
                </a>
              ))}
            </div>
          </motion.section>
        )}
      </motion.main>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('studio.confirm.deleteTitle')}
        description={t('studio.confirm.deleteBody')}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(component.slug, {
            onSuccess: () => navigate('/studio'),
            onSettled: () => setConfirmDelete(false),
          })
        }
      />
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title={t('studio.confirm.unpublishTitle')}
        description={t('studio.confirm.unpublishBody')}
        loading={unpublish.isPending}
        onConfirm={() =>
          unpublish.mutate(component.slug, { onSettled: () => setConfirmUnpublish(false) })
        }
      />
    </AppShell>
  )
}

function Metric({
  icon,
  label,
  hint,
  children,
}: {
  icon: ReactNode
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-text">{children}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Skeleton del detalle propio mientras carga (replica cabecera + métricas). */
function MyComponentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Skeleton className="mb-6 h-5 w-36" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-6 w-20 rounded-pill" />
      </div>
      <Skeleton className="mt-4 h-5 w-2/3" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
