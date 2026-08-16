/**
 * Landing pública. Estética "silent precision": hero grande con fondo animado,
 * carrusel de últimos componentes (datos reales) y un bloque de propuesta de
 * valor. El CTA se adapta a la sesión (invitado vs registrado).
 */
import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, LayoutDashboard } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { LatestCarousel } from '@/components/LatestCarousel'
import { useAuth } from '@/auth/useAuth'
import { useI18n } from '@/i18n/useI18n'
import { useExploreComponents } from '@/studio/hooks'
import type { ComponentFilters } from '@/studio/api'

// Identidad estable → misma clave de caché de react-query en cada render.
const LATEST_FILTERS: ComponentFilters = { sort: 'newest' }

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, type: 'spring', stiffness: 200, damping: 24 },
  }),
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()

  const { data } = useExploreComponents(LATEST_FILTERS)
  const latest = (data?.pages[0]?.data ?? []).slice(0, 12)

  const scrollToLatest = () => {
    document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center py-16 text-center">
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-3xl text-5xl leading-[0.95] md:text-7xl"
          >
            <span className="block font-light italic text-muted">Lay the foundation,</span>
            <span className="block font-extrabold text-navy">Ship the product.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-xl text-lg text-muted"
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="group inline-flex min-w-[13rem] items-center justify-center gap-2 rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white shadow-navy transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-hover active:scale-[0.98]"
              >
                <LayoutDashboard className="size-4" />
                {t('home.ctaDashboard')}
              </Link>
            ) : (
              <Link
                to="/register"
                className="group inline-flex min-w-[13rem] items-center justify-center gap-2 rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white shadow-navy transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-hover active:scale-[0.98]"
              >
                {t('home.ctaStart')}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

            <Link
              to={isAuthenticated ? '/components' : '/login'}
              className="inline-flex min-w-[13rem] items-center justify-center gap-2 rounded-pill border border-navy-200 bg-surface px-6 py-3 text-sm font-semibold text-text shadow-card backdrop-blur transition hover:border-accent hover:shadow-hover active:scale-[0.98]"
            >
              {isAuthenticated ? t('home.ctaExplore') : t('home.ctaLogin')}
            </Link>
          </motion.div>

          {/* Indicador de scroll hacia el carrusel */}
          {latest.length > 0 && (
            <motion.button
              type="button"
              onClick={scrollToLatest}
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-16 flex flex-col items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition hover:text-text"
            >
              {t('home.scrollCue')}
              <ChevronDown className="size-4 animate-bounce" />
            </motion.button>
          )}
        </section>

        {/* ── Últimos componentes ──────────────────────────────────────── */}
        {latest.length > 0 && (
          <section id="latest" className="scroll-mt-20 py-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                  {t('home.latest.eyebrow')}
                </p>
                <h2 className="text-3xl">{t('home.latest.title')}</h2>
              </div>
              <Link
                to="/components"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-text transition hover:text-accent"
              >
                {t('home.latest.viewAll')}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <LatestCarousel components={latest} />
          </section>
        )}

        {/* ── Por qué Layerbase ────────────────────────────────────────── */}
        <section className="py-16 pb-24">
          <div className="mb-8">
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-accent">
              {t('home.why.eyebrow')}
            </p>
            <h2 className="max-w-2xl text-3xl">{t('home.why.title')}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(['authors', 'buyers', 'teams'] as const).map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: 0.06 * i, type: 'spring', stiffness: 200, damping: 24 }}
                className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-xl"
              >
                <p className="mb-3 font-mono text-xs font-semibold text-navy">
                  {t(`home.why.${key}.role`)}
                </p>
                <h3 className="mb-2 text-lg">{t(`home.why.${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted">{t(`home.why.${key}.body`)}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  )
}
