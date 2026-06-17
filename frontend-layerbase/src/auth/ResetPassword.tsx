/**
 * Restablece la contraseña a partir del token y email que llegan por query
 * string (el enlace lo genera el backend apuntando a esta ruta).
 */
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/Login/auth'
import { applyServerErrors } from '@/auth/formErrors'
import { AuthCard, SubmitButton, TextField } from '@/auth/ui'
import { useI18n } from '@/i18n/useI18n'
import { getErrorMessage } from '@/lib/api'

interface FormValues {
  password: string
  password_confirmation: string
}

export default function ResetPassword() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { password: '', password_confirmation: '' } })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.resetPassword({ token, email, ...values })
      toast.success(t('auth.reset.success'))
      navigate('/login', { replace: true })
    } catch (error) {
      if (!applyServerErrors(error, setError)) {
        toast.error(getErrorMessage(error, t('common.error')))
      }
    }
  })

  if (!token || !email) {
    return (
      <AuthCard title={t('auth.reset.invalidTitle')} subtitle={t('auth.reset.invalidSubtitle')}>
        <Link to="/forgot-password" className="text-accent hover:underline">
          {t('auth.reset.invalidLink')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle', { email })}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField
          label={t('auth.reset.newPassword')}
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
        <SubmitButton loading={isSubmitting}>{t('auth.reset.submit')}</SubmitButton>
      </form>
    </AuthCard>
  )
}
