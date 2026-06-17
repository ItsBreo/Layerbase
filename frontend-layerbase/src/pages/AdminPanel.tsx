/**
 * Panel de administración (placeholder). Protegido por <AdminRoute>:
 * solo usuarios con rol 'admin' llegan aquí.
 */
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { useI18n } from '@/i18n/useI18n'

export default function AdminPanel() {
  const { t } = useI18n()

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/60 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-accent backdrop-blur">
            <ShieldCheck className="size-3.5" />
            {t('admin.badge')}
          </div>
          <h1 className="mt-4 text-4xl">{t('admin.title')}</h1>
          <p className="mt-4 max-w-xl text-muted">{t('admin.body')}</p>
        </motion.div>
      </main>
    </AppShell>
  )
}
