/**
 * Solicita el email de restablecimiento de contraseña.
 * La respuesta es siempre genérica (no revela si el email existe).
 */
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/Login/auth'
import { applyServerErrors } from '@/auth/formErrors'
import { AuthCard, SubmitButton, TextField } from '@/auth/ui'
import { useI18n } from '@/i18n/useI18n'
import { getErrorMessage } from '@/lib/api'

interface FormValues {
  email: string
}

export default function ForgotPassword() {
  const { t } = useI18n()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>({ defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      const { message } = await authApi.forgotPassword(email)
      toast.success(message)
    } catch (error) {
      if (!applyServerErrors(error, setError)) {
        toast.error(getErrorMessage(error, t('common.error')))
      }
    }
  })

  return (
    <AuthCard
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <Link to="/login" className="text-accent hover:underline">
          {t('auth.forgot.back')}
        </Link>
      }
    >
      {isSubmitSuccessful ? (
        <p className="text-center text-sm text-muted">{t('auth.forgot.sent')}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: t('auth.validation.emailRequired') })}
          />
          <SubmitButton loading={isSubmitting}>{t('auth.forgot.submit')}</SubmitButton>
        </form>
      )}
    </AuthCard>
  )
}
