/**
 * Piezas de UI compartidas por las pantallas de autenticación.
 * Estética "silent precision": fondo animado, tarjeta de cristal y los tokens
 * del design system (bg-surface, border-border, accent…).
 */
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { authApi } from '@/Login/auth'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { BrandWordmark } from '@/components/Brand'
import { GithubIcon, GoogleIcon } from '@/components/icons/BrandIcons'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import type { OAuthProvider } from '@/auth/types'

/** Tarjeta centrada sobre el fondo animado: título, subtítulo y formulario. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-bg px-4 py-12">
      <AnimatedBackground />

      {/* Funciones globales accesibles también en las pantallas de auth. */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative z-10 w-full max-w-sm"
      >
        <Link to="/" className="mb-8 flex justify-center" aria-label="Inicio">
          <BrandWordmark className="h-6 w-auto" />
        </Link>

        <div className="rounded-2xl border border-border bg-surface/60 p-8 shadow-elevated backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </motion.div>
    </div>
  )
}

type TextFieldProps = ComponentPropsWithRef<'input'> & {
  label: string
  error?: string
}

/** Campo de texto con etiqueta y mensaje de error accesible. */
export function TextField({ label, error, id, name, ...props }: TextFieldProps) {
  const fieldId = id ?? name
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-lg border bg-bg/50 px-3 py-2.5 text-sm text-text outline-none transition',
          'placeholder:text-muted focus:border-accent disabled:opacity-60',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Botón primario de envío con estado de carga. */
export function SubmitButton({
  loading,
  children,
  ...props
}: ComponentPropsWithRef<'button'> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-navy transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  )
}

/**
 * Botones de inicio con proveedor OAuth. Navegan con el navegador completo
 * (no fetch) porque el flujo OAuth implica redirecciones cross-origin que
 * terminan en /auth/callback con el token en el fragmento de la URL.
 */
const OAUTH_PROVIDERS = [
  { id: 'github', label: 'GitHub', Icon: GithubIcon },
  { id: 'google', label: 'Google', Icon: GoogleIcon },
] as const satisfies ReadonlyArray<{
  id: OAuthProvider
  label: string
  Icon: (props: { className?: string }) => ReactElement
}>

export function OAuthButtons() {
  // `assign()` y no `location.href = ...`: es una navegación completa fuera de
  // la SPA (al proveedor OAuth), y asignar a una propiedad de un objeto externo
  // al componente es lo que marca la regla de inmutabilidad del compilador.
  const go = (provider: OAuthProvider) => {
    window.location.assign(authApi.oauthRedirectUrl(provider))
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {OAUTH_PROVIDERS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => go(id)}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-bg/40 px-3 py-2.5 text-sm font-medium text-text transition hover:border-accent hover:bg-bg/70 active:scale-[0.98]"
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

/** Separador "o" entre OAuth y el formulario de email. */
export function OrDivider() {
  const { t } = useI18n()
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-border" />
      {t('auth.orEmail')}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
