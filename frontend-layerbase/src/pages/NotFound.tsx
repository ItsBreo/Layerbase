import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { useI18n } from '@/i18n/useI18n'

export default function NotFound() {
  const { t } = useI18n()

  return (
    <AppShell>
      <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-mono text-sm tracking-[0.2em] text-accent">404</p>
        <h1 className="text-4xl">{t('notFound.title')}</h1>
        <p className="text-muted">{t('notFound.body')}</p>
        <Link
          to="/"
          className="mt-3 inline-flex items-center gap-2 rounded-pill border border-border bg-surface/50 px-5 py-2.5 text-sm font-semibold text-text backdrop-blur transition hover:border-accent"
        >
          <ArrowLeft className="size-4" />
          {t('notFound.back')}
        </Link>
      </div>
    </AppShell>
  )
}
