/**
 * Sección de métricas de la plataforma (Home).
 *
 * Los números hacen "count-up" al entrar en viewport. La tendencia (↑/↓) es
 * mock por ahora; cuando el backend exponga la variación, se rellena igual.
 */
import { useEffect, useRef } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { Boxes, Download, Eye, TrendingDown, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { usePlatformStats } from '@/features/marketplace/queries'
import type { PlatformStats } from '@/features/marketplace/types'
import { cn } from '@/lib/utils'

interface MetricDef {
  key: keyof PlatformStats
  labelKey: string
  icon: LucideIcon
  /** Variación mock (positiva = al alza). */
  trend: number
  compact?: boolean
}

const METRICS: MetricDef[] = [
  { key: 'componentsPublished', labelKey: 'home.metrics.componentsPublished', icon: Boxes, trend: 12.4 },
  { key: 'activeAuthors', labelKey: 'home.metrics.activeAuthors', icon: Users, trend: 4.1 },
  { key: 'totalDownloads', labelKey: 'home.metrics.totalDownloads', icon: Download, trend: 23.7, compact: true },
  { key: 'pageViews', labelKey: 'home.metrics.pageViews', icon: Eye, trend: -2.3, compact: true },
]

export function MetricsSection() {
  const { t } = useI18n()
  const { data } = usePlatformStats()

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-6xl px-6 py-24"
    >
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl">
          {t('home.metrics.titleLead')}{' '}
          <span className="text-navy">{t('home.metrics.titleAccent')}</span>
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted">{t('home.metrics.subtitle')}</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon
          const up = metric.trend >= 0
          return (
            <div
              key={metric.key}
              className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-xl transition hover:border-accent/50 hover:shadow-hover"
            >
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-accent" />
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs font-semibold',
                    up ? 'text-success' : 'text-danger',
                  )}
                >
                  {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {Math.abs(metric.trend)}%
                </span>
              </div>
              <div className="mt-4 font-display text-3xl font-extrabold text-text md:text-4xl">
                <CountUp value={data?.[metric.key] ?? 0} compact={metric.compact} />
              </div>
              <p className="mt-1 text-sm text-muted">{t(metric.labelKey)}</p>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

function formatNumber(value: number, compact?: boolean): string {
  return new Intl.NumberFormat('en', compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}).format(
    value,
  )
}

function CountUp({ value, compact }: { value: number; compact?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => formatNumber(Math.round(v), compact))

  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, value, { duration: 1.2, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, value, mv])

  return <motion.span ref={ref}>{text}</motion.span>
}
