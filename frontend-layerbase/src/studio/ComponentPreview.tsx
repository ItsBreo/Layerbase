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
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useI18n } from '@/i18n/useI18n'
import { ComponentSandbox } from '@/studio/ComponentSandbox'
import { useComponent, usePreviewCode } from '@/studio/hooks'
import { defaultFilesFor, type ComponentFiles } from '@/studio/zip'
import type { Stack } from '@/studio/types'

interface PreviewState {
  files?: ComponentFiles
  stack?: Stack
}

/** Relleno del playground suelto (`/studio/preview`, sin componente). */
const DEFAULT_FILES: ComponentFiles = defaultFilesFor('react')

export default function ComponentPreview() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams<{ slug: string }>()
  const state = (location.state as PreviewState | null) ?? {}

  // Componente guardado (si hay slug en la ruta).
  const { data: component, isLoading: loadingComponent } = useComponent(slug)

  // Código del componente guardado, por el mismo camino que usa la ficha
  // pública. Solo se pide si NO hay código en el state (borrador sin guardar).
  // Borrador sin guardar, llegado por el state del router.
  const draftFiles = Object.keys(state.files ?? {}).length > 0 ? state.files : undefined
  const savedSource = usePreviewCode(slug, !draftFiles && component?.has_source === true)

  const stack: Stack = state.stack ?? component?.stack ?? 'react'

  /*
   * Se espera también a que llegue el COMPONENTE, no solo su código: hasta
   * entonces no se sabe si tiene fuente que descargar, y el sandbox se montaba
   * con el código de relleno ("Tu componente aquí") para sustituirlo un
   * instante después. Ese parpadeo parecía que el componente estaba vacío.
   */
  const isLoadingCode =
    !draftFiles && !!slug && (loadingComponent || (savedSource.isLoading && component?.has_source === true))

  // Un fallo al descargar no puede disfrazarse de componente vacío: se avisa.
  const loadFailed = !draftFiles && savedSource.isError
  const files = draftFiles ?? savedSource.data ?? DEFAULT_FILES

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
          <>
            {loadFailed && (
              <div className="mt-8 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>{t('studio.preview.loadFailed')}</p>
              </div>
            )}
            <div className="mt-8 overflow-hidden rounded-lg border border-border">
              <ComponentSandbox files={files} withEditor height={480} />
            </div>
          </>
        )}
      </main>
    </AppShell>
  )
}
