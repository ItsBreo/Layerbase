/**
 * Entrada de etiquetas tipo "chips": se añade con Enter o coma, se elimina con
 * la X o con Retroceso sobre el input vacío. Controlado (value / onChange).
 */
import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { FieldShell } from '@/components/ui/Field'

const MAX_TAGS = 10

export function TagInput({
  value,
  onChange,
  label,
  placeholder,
  hint,
  error,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  label?: string
  placeholder?: string
  hint?: string
  error?: string
}) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag || value.includes(tag) || value.length >= MAX_TAGS) return
    onChange([...value, tag])
    setDraft('')
  }

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <FieldShell label={label} hint={hint} error={error}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-bg/50 p-2 focus-within:border-accent">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-pill bg-navy-50 px-2 py-0.5 font-mono text-xs text-navy"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-navy/60 transition hover:text-danger"
              aria-label={`Quitar ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : undefined}
          disabled={value.length >= MAX_TAGS}
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm text-text outline-none placeholder:text-muted"
        />
      </div>
    </FieldShell>
  )
}
