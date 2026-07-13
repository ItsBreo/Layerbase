/**
 * Editor de código Monaco. El lenguaje se deriva del stack del componente y el
 * tema se sincroniza con el tema global de la app (claro/oscuro).
 */
import Editor from '@monaco-editor/react'
import { FieldShell } from '@/components/ui/Field'
import { useTheme } from '@/hooks/useTheme'
import type { Stack } from '@/studio/types'

const LANGUAGE_BY_STACK: Record<Stack, string> = {
  react: 'javascript',
  angular: 'typescript',
  vanilla: 'javascript',
}

export function CodeEditor({
  value,
  onChange,
  stack,
  label,
  hint,
  height = 360,
}: {
  value: string
  onChange: (code: string) => void
  stack: Stack
  label?: string
  hint?: string
  height?: number
}) {
  const { theme } = useTheme()

  return (
    <FieldShell label={label} hint={hint}>
      <div className="overflow-hidden rounded-lg border border-border">
        <Editor
          height={height}
          language={LANGUAGE_BY_STACK[stack]}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
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
