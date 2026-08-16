/**
 * Pantalla de inicio de sesión (email + contraseña y OAuth).
 *
 * Tras autenticar, vuelve al destino previo (si el usuario fue redirigido aquí
 * por un guard) o al dashboard.
 */
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { applyServerErrors } from '@/auth/formErrors'
import { AuthCard, OAuthButtons, OrDivider, SubmitButton, TextField } from '@/auth/ui'
import type { LoginCredentials } from '@/auth/types'
import { useI18n } from '@/i18n/useI18n'
import { getErrorMessage } from '@/lib/api'

/**
 * Muestra el error de OAuth que venga en la URL y lo limpia, para que no
 * reaparezca al recargar ni al volver atrás.
 */
function useOAuthErrorToast(): void {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const shown = useRef(false)

  useEffect(() => {
    const error = params.get('error')
    if (!error || shown.current) return
    shown.current = true

    const messages: Record<string, string> = {
      oauth: t('auth.oauth.errorProvider'),
      banned: t('auth.oauth.errorBanned'),
      oauth_state: t('auth.oauth.errorState'),
      oauth_email_taken: t('auth.oauth.errorEmailTaken'),
    }

    toast.error(messages[error] ?? t('auth.oauth.errorGeneric'))

    const next = new URLSearchParams(params)
    next.delete('error')
    setParams(next, { replace: true })
  }, [params, setParams, t])
}

export default function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard'

  // El backend rechaza ciertos flujos de OAuth redirigiendo aquí con `?error=`
  // (proveedor caído, cuenta suspendida, `state` inválido, email ya ocupado por
  // una cuenta sin verificar). Nadie leía ese parámetro, así que esos avisos se
  // perdían y el usuario volvía al login sin saber por qué.
  useOAuthErrorToast()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginCredentials>({ defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
      toast.success(t('auth.login.success'))
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (!applyServerErrors(error, setError)) {
        toast.error(getErrorMessage(error, t('auth.login.error')))
      }
    }
  })

  return (
    <AuthCard
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.footerText')}{' '}
          <Link to="/register" className="text-accent hover:underline">
            {t('auth.login.footerLink')}
          </Link>
        </>
      }
    >
      <OAuthButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: t('auth.validation.emailRequired') })}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: t('auth.validation.passwordRequired') })}
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-muted hover:text-accent">
            {t('auth.login.forgot')}
          </Link>
        </div>

        <SubmitButton loading={isSubmitting}>
          {t('auth.login.submit')}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
