/**
 * #20 Preview en sandbox — renderizado aislado de un componente React con
 * Sandpack. La hoja de ruta lo marca como tarea paralela y de menor prioridad
 * que el CRUD, así que la integración es deliberadamente ligera:
 *
 * - Previsualiza código en borrador que llega por el `state` del router (botón
 *   "Vista previa" del formulario), sin necesidad de guardarlo antes.
 * - Solo React: Angular/Vanilla muestran un aviso (Sandpack aquí usa la
 *   plantilla de React).
 */
import { Sandpack } from '@codesandbox/sandpack-react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useI18n } from '@/i18n/useI18n'
import { useTheme } from '@/hooks/useTheme'
import type { Stack } from '@/studio/types'

interface PreviewState {
  code?: string
  stack?: Stack
}

const DEFAULT_CODE = `export default function App() {
  return <div style={{ padding: 24 }}>Tu componente aquí</div>
}
`

export default function ComponentPreview() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const state = (location.state as PreviewState | null) ?? {}

  const stack = state.stack ?? 'react'
  const code = state.code?.trim() ? state.code : DEFAULT_CODE

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text"
        >
          <ArrowLeft className="size-4" />
          {t('studio.form.cancel')}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          <h1 className="text-3xl">{t('studio.preview.title')}</h1>
          <p className="mt-2 text-muted">{t('studio.preview.subtitle')}</p>
        </motion.div>

        {stack !== 'react' ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center text-sm text-muted">
            {t('studio.preview.onlyReact')}
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-border">
            <Sandpack
              template="react"
              theme={theme === 'dark' ? 'dark' : 'light'}
              files={{ '/App.js': code }}
              options={{ editorHeight: 480, showLineNumbers: true }}
            />
          </div>
        )}
      </main>
    </AppShell>
  )
}
