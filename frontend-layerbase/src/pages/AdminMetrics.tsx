/**
 * Panel de admin — resumen de la plataforma.
 *
 * Portada de solo lectura: cuánta gente hay, en qué estado están los
 * componentes y qué se está mirando. Todo sale de agregaciones en el backend
 * (`Api\Admin\MetricsController`), no de traer filas y contarlas aquí.
 *
 * Solo hay UNA gráfica, la serie de visitas, porque es el único dato que cambia
 * con el tiempo. El resto son cifras sueltas y rankings de cinco elementos: ahí
 * una tarjeta o una lista se leen mejor que cualquier gráfico.
 */
import { motion } from 'framer-motion'
import { Download, Eye, Layers, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/Badge'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { AdminNav } from '@/admin/AdminNav'
import { ViewsTrend } from '@/admin/ViewsTrend'
import { useAdminMetrics } from '@/admin/hooks'
import { COMPONENT_STATUSES } from '@/studio/types'
import type { ReactNode } from 'react'

export default function AdminMetrics() {
  const { t } = useI18n()
  const { data, isLoading } = useAdminMetrics()

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
          <AccentedTitle text={t('admin.metrics.title')} className="mt-4 text-4xl" />
          <p className="mt-3 max-w-xl text-muted">{t('admin.metrics.body')}</p>
        </motion.div>

        <AdminNav />

        {isLoading || !data ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-56 rounded-lg" />
          </div>
        ) : (
          <>
            {/* Cifras de cabecera */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={<UsersIcon className="size-4" />}
                label={t('admin.metrics.stats.users')}
                value={data.users.total}
                hint={t('admin.metrics.stats.recent', {
                  count: data.users.recent,
                  days: data.window_days,
                })}
              />
              <Stat
                icon={<Layers className="size-4" />}
                label={t('admin.metrics.stats.components')}
                value={data.components.total}
                hint={t('admin.metrics.stats.publishedRecent', {
                  count: data.components.published_recent,
                  days: data.window_days,
                })}
              />
              <Stat
                icon={<Download className="size-4" />}
                label={t('admin.metrics.stats.downloads')}
                value={data.components.downloads}
              />
              <Stat
                icon={<Eye className="size-4" />}
                label={t('admin.metrics.stats.views')}
                value={data.activity.views_total}
                hint={t('admin.metrics.stats.viewsRecent', {
                  count: data.activity.views_recent,
                  days: data.window_days,
                })}
              />
            </div>

            {/* Serie temporal */}
            <section className="mt-8 rounded-lg border border-border bg-surface p-5">
              <ViewsTrend
                daily={data.activity.daily_views}
                days={data.window_days}
                title={t('admin.metrics.trend', { days: data.window_days })}
              />
            </section>

            {/* Componentes por estado */}
            <section className="mt-8">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {t('admin.metrics.byStatus')}
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {COMPONENT_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  >
                    <StatusBadge status={status} />
                    <span className="text-lg font-semibold text-text">
                      {data.components.statuses[status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Rankings */}
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <Panel title={t('admin.metrics.topComponents')}>
                {data.top_components.length === 0 ? (
                  <Empty text={t('admin.metrics.empty')} />
                ) : (
                  <ol className="divide-y divide-border">
                    {data.top_components.map((component, index) => (
                      <li key={component.slug} className="flex items-center gap-3 py-2.5">
                        <Rank index={index} />
                        <Link
                          to={`/components/${component.slug}`}
                          className="min-w-0 flex-1 truncate text-sm text-text transition-colors hover:text-accent"
                        >
                          {component.title}
                          {component.author && (
                            <span className="ml-2 font-display text-xs text-muted">
                              {component.author}
                            </span>
                          )}
                        </Link>
                        <span className="shrink-0 font-mono text-xs text-muted">
                          {t('admin.metrics.viewsShort', { count: component.views })}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>

              <Panel title={t('admin.metrics.topAuthors')}>
                {data.top_authors.length === 0 ? (
                  <Empty text={t('admin.metrics.empty')} />
                ) : (
                  <ol className="divide-y divide-border">
                    {data.top_authors.map((author, index) => (
                      <li key={author.id} className="flex items-center gap-3 py-2.5">
                        <Rank index={index} />
                        {/* Los nombres de usuario van SIEMPRE en Syne. */}
                        <Link
                          to={`/users/${author.id}`}
                          className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-text transition-colors hover:text-accent"
                        >
                          {author.name}
                        </Link>
                        <span className="shrink-0 font-mono text-xs text-muted">
                          {t('admin.metrics.componentsShort', { count: author.components })}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
          </>
        )}
      </main>
    </AppShell>
  )
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold text-text">{value.toLocaleString()}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/** El primer puesto se destaca; el resto quedan en gris. */
function Rank({ index }: { index: number }) {
  return (
    <span
      className={cn(
        'w-5 shrink-0 font-mono text-xs',
        index === 0 ? 'text-accent' : 'text-muted',
      )}
    >
      {index + 1}
    </span>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted">{text}</p>
}
