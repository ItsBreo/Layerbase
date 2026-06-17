/**
 * Landing pública. Estética "silent precision": titular grande de peso mixto,
 * fondo animado y CTA que se adapta a la sesión (invitado vs registrado).
 */
import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n/useI18n'

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

  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <motion.span
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="font-mono text-xs uppercase tracking-[0.25em] text-muted"
        >
        </motion.span>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-7 text-5xl leading-[0.95] md:text-7xl"
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
            to={isAuthenticated ? '/' : '/login'}
            className="inline-flex min-w-[13rem] items-center justify-center gap-2 rounded-pill border border-border bg-surface/50 px-6 py-3 text-sm font-semibold text-text backdrop-blur transition hover:border-accent active:scale-[0.98]"
          >
            {isAuthenticated ? t('home.ctaExplore') : t('home.ctaLogin')}
          </Link>
        </motion.div>

        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-20 w-full"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted/70">
            {t('home.builtWith')}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted/60">
            {['React', 'TypeScript', 'Tailwind CSS', 'Laravel', 'Stripe', 'Meilisearch'].map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </motion.div>
      </main>
    </AppShell>
  )
}
