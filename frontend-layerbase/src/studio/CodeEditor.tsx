/**
 * Editor de código de un componente, con VARIOS ficheros.
 *
 * Antes era un único Monaco sobre un solo string: un componente no podía tener
 * más de un archivo, que es una limitación seria para lo que la plataforma dice
 * ser. Ahora hay pestañas, y el editor trabaja sobre un mapa nombre → contenido.
 *
 * El lenguaje se deriva de la EXTENSIÓN de cada fichero y no del stack: un
 * componente de React puede llevar perfectamente un `.css` o un `.ts` al lado.
 */
import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Check, FilePlus, X } from 'lucide-react'
import { FieldShell } from '@/components/ui/Field'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { entryFileOf, type ComponentFiles } from '@/studio/zip'

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  css: 'css',
  scss: 'scss',
  html: 'html',
  json: 'json',
  md: 'markdown',
}

function languageOf(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANGUAGE_BY_EXTENSION[extension] ?? 'plaintext'
}

/** Nombre de fichero admisible: sin rutas ni caracteres raros. */
function isValidName(name: string): boolean {
  return /^[\w.-]+\.[A-Za-z0-9]+$/.test(name)
}

export function CodeEditor({
  files,
  onChange,
  label,
  hint,
  height = 360,
}: {
  files: ComponentFiles
  onChange: (files: ComponentFiles) => void
  label?: string
  hint?: string
  height?: number
}) {
  const { theme } = useTheme()
  const { t } = useI18n()

  const names = Object.keys(files)
  const entry = entryFileOf(files)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  /*
   * El fichero abierto se DERIVA, no se sincroniza con un efecto.
   *
   * El estado guarda cuál pidió el autor; cuál se muestra se decide en el
   * render comprobando que siga existiendo. Así, si el fichero abierto
   * desaparece —se borró, o llegaron otros al cargar un componente guardado—
   * cae solo al punto de entrada, sin un setState dentro de un efecto que
   * encadenaría un render extra.
   */
  const [requested, setRequested] = useState<string | null>(null)
  const active = requested !== null && names.includes(requested) ? requested : entry

  const addFile = () => {
    const name = newName.trim()
    if (!isValidName(name) || names.includes(name)) return
    onChange({ ...files, [name]: '' })
    setRequested(name)
    setNewName('')
    setAdding(false)
  }

  const removeFile = (name: string) => {
    const rest = { ...files }
    delete rest[name]
    onChange(rest)
  }

  return (
    <FieldShell label={label} hint={hint}>
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Pestañas */}
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface/60 p-1.5">
          {names.map((name) => (
            <span
              key={name}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs transition-colors',
                name === active
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-navy-50 hover:text-text',
              )}
            >
              <button type="button" onClick={() => setRequested(name)}>
                {name}
              </button>
              {/* El punto de entrada no se puede borrar: sin él no hay
                  componente que renderizar. */}
              {name !== entry && (
                <button
                  type="button"
                  onClick={() => removeFile(name)}
                  aria-label={t('studio.form.removeFile', { name })}
                  className="opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}

          {adding ? (
            <span className="inline-flex items-center gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFile()
                  if (e.key === 'Escape') { setAdding(false); setNewName('') }
                }}
                placeholder={t('studio.form.newFilePlaceholder')}
                className="h-7 w-40 rounded-md border border-border bg-bg px-2 font-mono text-xs text-text outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={addFile}
                disabled={!isValidName(newName.trim()) || names.includes(newName.trim())}
                aria-label={t('studio.form.addFile')}
                className="text-accent disabled:opacity-40"
              >
                <Check className="size-3.5" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:bg-navy-50 hover:text-text"
            >
              <FilePlus className="size-3.5" />
              {t('studio.form.addFile')}
            </button>
          )}
        </div>

        <Editor
          height={height}
          // `path` hace que Monaco mantenga un modelo por fichero: al cambiar de
          // pestaña se conserva el historial de deshacer y la posición del cursor.
          path={active}
          language={languageOf(active)}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={files[active] ?? ''}
          onChange={(v) => onChange({ ...files, [active]: v ?? '' })}
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>
    </FieldShell>
  )
}
