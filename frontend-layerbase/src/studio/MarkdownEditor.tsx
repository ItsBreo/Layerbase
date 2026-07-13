/**
 * Editor de README con dos pestañas: "Escribir" (textarea) y "Vista previa"
 * (renderizado Markdown con react-markdown). Controlado (value / onChange).
 */
import { useState } from 'react'
import Markdown from 'react-markdown'
import { FieldShell } from '@/components/ui/Field'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

export function MarkdownEditor({
  value,
  onChange,
  label,
  hint,
  placeholder,
}: {
  value: string
  onChange: (md: string) => void
  label?: string
  hint?: string
  placeholder?: string
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  return (
    <FieldShell label={label} hint={hint}>
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Pestañas */}
        <div className="flex border-b border-border bg-bg/40">
          <TabButton active={tab === 'write'} onClick={() => setTab('write')}>
            {t('studio.form.readmeWrite')}
          </TabButton>
          <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>
            {t('studio.form.readmePreview')}
          </TabButton>
        </div>

        {tab === 'write' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-56 w-full resize-y bg-surface px-4 py-3 font-mono text-sm text-text outline-none placeholder:text-muted"
          />
        ) : (
          <div className="prose-invert min-h-56 px-4 py-3 text-sm text-text">
            {value.trim() ? (
              <MarkdownBody source={value} />
            ) : (
              <p className="text-muted">—</p>
            )}
          </div>
        )}
      </div>
    </FieldShell>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-xs font-medium transition',
        active ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Renderiza Markdown con estilos ligeros del design system. Se aísla para poder
 * reutilizarlo (p. ej. en el detalle público del componente).
 */
export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="space-y-3 leading-relaxed [&_a]:text-accent [&_code]:font-mono [&_code]:text-xs [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-bg [&_pre]:p-3">
      <Markdown>{source}</Markdown>
    </div>
  )
}
