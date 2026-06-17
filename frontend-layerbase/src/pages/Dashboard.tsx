/**
 * Panel del usuario autenticado (placeholder). Solo accesible vía
 * <ProtectedRoute>; demuestra el consumo de la sesión.
 */
import { motion } from 'framer-motion'
import { BadgeCheck, Mail, ShieldCheck, Store } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n/useI18n'

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useI18n()
  if (!user) return null

  const cards = [
    { icon: Mail, label: t('dashboard.email'), value: user.email },
    { icon: ShieldCheck, label: t('dashboard.role'), value: t(`dashboard.roles.${user.role}`) },
    {
      icon: BadgeCheck,
      label: t('dashboard.emailVerified'),
      value: user.email_verified_at ? t('dashboard.yes') : t('dashboard.pending'),
    },
    {
      icon: Store,
      label: t('dashboard.stripe'),
      value: user.stripe_onboarded ? t('dashboard.connected') : t('dashboard.notConnected'),
    },
  ]

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            {t('dashboard.eyebrow')}
          </p>
          <h1 className="mt-2 text-4xl">{t('dashboard.greeting', { name: user.name })}</h1>
          <p className="mt-2 text-muted">{t('dashboard.subtitle')}</p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i, type: 'spring', stiffness: 200, damping: 24 }}
                className="rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-xl transition hover:border-accent/50 hover:shadow-hover"
              >
                <div className="flex items-center gap-2 text-muted">
                  <Icon className="size-4" />
                  <span className="text-xs uppercase tracking-wide">{card.label}</span>
                </div>
                <p className="mt-2 truncate text-lg font-medium text-text">{card.value}</p>
              </motion.div>
            )
          })}
        </div>
      </main>
    </AppShell>
  )
}
