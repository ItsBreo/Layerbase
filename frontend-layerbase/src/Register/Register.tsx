/**
 * Pantalla de registro (email + contraseña y OAuth).
 *
 * Al registrarse, el backend ya devuelve un token, así que se entra
 * directamente sin pasar por el login.
 */
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { applyServerErrors } from '@/auth/formErrors'
import { AuthCard, OAuthButtons, OrDivider, SubmitButton, TextField } from '@/auth/ui'
import type { RegisterPayload } from '@/auth/types'
import { useI18n } from '@/i18n/useI18n'
import { getErrorMessage } from '@/lib/api'

export default function Register() {
  const { register: registerUser } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterPayload>({
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser(values)
      toast.success(t('auth.register.success'))
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (!applyServerErrors(error, setError)) {
        toast.error(getErrorMessage(error, t('auth.register.error')))
      }
    }
  })

  return (
    <AuthCard
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.footerText')}{' '}
          <Link to="/login" className="text-accent hover:underline">
            {t('auth.register.footerLink')}
          </Link>
        </>
      }
    >
      <OAuthButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField
          label={t('auth.name')}
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', { required: t('auth.validation.nameRequired') })}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: t('auth.validation.passwordRequired'),
            minLength: { value: 8, message: t('auth.validation.passwordMin') },
          })}
        />
        <TextField
          label={t('auth.passwordConfirm')}
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation', {
            required: t('auth.validation.passwordConfirm'),
            validate: (value) =>
              value === watch('password') || t('auth.validation.passwordMismatch'),
          })}
        />

        <SubmitButton loading={isSubmitting}>
          {t('auth.register.submit')}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
