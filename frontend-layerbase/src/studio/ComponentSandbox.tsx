/**
 * Render aislado de un componente en Sandpack.
 *
 * Único punto donde se monta el sandbox, compartido por dos vistas con
 * necesidades distintas:
 *  - Studio (`/studio/:slug/preview`): el autor revisa su propio código, así
 *    que se muestra con editor (`withEditor`), que con varios ficheros pinta
 *    su propio explorador.
 *  - Ficha pública (`/components/:slug`): solo el resultado renderizado. Nada
 *    de editor ni de "Open in CodeSandbox": el código es del autor y en los
 *    componentes de pago ni siquiera llega al navegador.
 */
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react'
import { useTheme } from '@/hooks/useTheme'
import { toSandpackFiles, type ComponentFiles } from '@/studio/zip'

export function ComponentSandbox({
  files,
  withEditor = false,
  height = 420,
}: {
  /** Nombre → contenido. Se traduce a rutas de Sandpack en `toSandpackFiles`. */
  files: ComponentFiles
  withEditor?: boolean
  height?: number
}) {
  const { theme } = useTheme()

  return (
    <SandpackProvider
      template="react"
      theme={theme === 'dark' ? 'dark' : 'light'}
      files={toSandpackFiles(files)}
    >
      <SandpackLayout>
        {withEditor && <SandpackCodeEditor showLineNumbers style={{ height }} />}
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={withEditor}
          style={{ height }}
        />
      </SandpackLayout>
    </SandpackProvider>
  )
}
