/**
 * #20 Preview en sandbox — renderizado aislado de un componente React con
 * Sandpack. La hoja de ruta lo marca como tarea paralela y de menor prioridad
 * que el CRUD, así que la integración es deliberadamente ligera.
 *
 * Dos fuentes de código:
 *  - Borrador desde el formulario: llega por el `state` del router (botón
 *    "Vista previa"), sin necesidad de guardarlo.
 *  - Componente guardado (`/studio/:slug/preview`): descarga el source (URL
 *    firmada), lo descomprime y muestra el código real.
 */
import { Sandpack } from '@codesandbox/sandpack-react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useI18n } from '@/i18n/useI18n'
import { useTheme } from '@/hooks/useTheme'
import { componentsApi } from '@/studio/api'
import { useComponent } from '@/studio/hooks'
import { unzipFirstTextFile } from '@/studio/zip'
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
  const { slug } = useParams<{ slug: string }>()
  const state = (location.state as PreviewState | null) ?? {}

  // Componente guardado (si hay slug en la ruta).
  const { data: component } = useComponent(slug)

  // Descarga + descomprime el código real del componente guardado. Solo se
  // ejecuta si NO hay código en el state (borrador) y sí hay slug con source.
  const draftCode = state.code?.trim()
  const savedSource = useQuery({
    queryKey: ['preview-source', slug],
    enabled: !draftCode && !!slug && !!component?.has_source,
    queryFn: async () => {
      const { url } = await componentsApi.download(slug as string)
      const res = await fetch(url)
      const buffer = await res.arrayBuffer()
      return unzipFirstTextFile(buffer)
    },
    retry: false,
  })

  const stack: Stack = state.stack ?? component?.stack ?? 'react'
  const isLoadingCode = !draftCode && !!slug && savedSource.isLoading && !!component?.has_source
  const code = draftCode || savedSource.data || DEFAULT_CODE

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
        ) : isLoadingCode ? (
          <div className="mt-8 flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted" />
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
