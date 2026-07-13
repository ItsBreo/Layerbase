/**
 * Botón del design system de Layerbase.
 *
 * Variantes tipificadas según la identidad de marca:
 * - primary   → CTA principal (azul acento). Ej. "Publicar componente".
 * - secondary → acción secundaria (borde). Ej. "Vista previa".
 * - ghost     → acción terciaria sin peso. Ej. "Cancelar".
 * - danger    → acción destructiva (rojo). Ej. "Despublicar", "Eliminar".
 *
 * Radio md (6px), padding 16px y la regla de sombra de la marca: sin sombra en
 * reposo, elevación solo en hover (salvo primary, que lleva shadow-navy de CTA).
 */
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-navy hover:bg-accent-hover active:scale-[0.98]',
  secondary:
    'border border-border bg-surface text-text hover:border-accent hover:shadow-hover active:scale-[0.98]',
  ghost: 'text-muted hover:bg-bg hover:text-text active:scale-[0.98]',
  danger: 'bg-danger text-white hover:brightness-110 active:scale-[0.98]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
}

type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className={cn(
            'animate-spin rounded-full border-2 border-current/30 border-t-current',
            size === 'sm' ? 'size-3.5' : 'size-4',
          )}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
