/**
 * Campos de formulario del design system: Input, Textarea y Select con label,
 * texto de ayuda y error accesibles. Radio md (6px), foco con borde acento.
 *
 * Pensados para integrarse con react-hook-form vía `register()` (aceptan ref y
 * el resto de props nativas).
 */
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Envoltorio label + ayuda + error compartido por todos los campos. */
export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

const baseControl =
  'w-full rounded-md border bg-bg px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent disabled:opacity-60'

type InputProps = ComponentPropsWithRef<'input'> & {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, id, name, required, className, ...props }: InputProps) {
  const fieldId = id ?? name
  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error} required={required}>
      <input
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(baseControl, 'h-11', error ? 'border-danger' : 'border-border', className)}
        {...props}
      />
    </FieldShell>
  )
}

type TextareaProps = ComponentPropsWithRef<'textarea'> & {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, id, name, required, className, ...props }: TextareaProps) {
  const fieldId = id ?? name
  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error} required={required}>
      <textarea
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(
          baseControl,
          'min-h-24 resize-y py-2.5 leading-relaxed',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
    </FieldShell>
  )
}

type SelectProps = ComponentPropsWithRef<'select'> & {
  label?: string
  hint?: string
  error?: string
}

export function Select({
  label,
  hint,
  error,
  id,
  name,
  required,
  className,
  children,
  ...props
}: SelectProps) {
  const fieldId = id ?? name
  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error} required={required}>
      <select
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(baseControl, 'h-11 cursor-pointer', error ? 'border-danger' : 'border-border', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}
