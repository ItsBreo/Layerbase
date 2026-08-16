/**
 * Destino del redirect de OAuth. El backend redirige aquí con el token en el
 * fragmento de la URL (#token=...) — el fragmento no viaja al servidor ni
 * queda en logs de acceso. En caso de error llega como ?error=... en la query.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useI18n } from '@/i18n/useI18n'

export default function OAuthCallback() {
  const { setSession } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Evita ejecutar dos veces el efecto en StrictMode (dev).
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const errorMessages: Record<string, string> = {
      oauth: t('auth.oauth.errorProvider'),
      banned: t('auth.oauth.errorBanned'),
    }

    const error = searchParams.get('error')
    if (error) {
      toast.error(errorMessages[error] ?? t('auth.oauth.errorGeneric'))
      navigate('/login', { replace: true })
      return
    }

    // El token llega en el hash: #token=...
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (!token) {
      toast.error(t('auth.oauth.errorToken'))
      navigate('/login', { replace: true })
      return
    }

    void setSession(token)
      .then(() => {
        toast.success(t('auth.oauth.success'))
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        toast.error(t('auth.oauth.errorSession'))
        navigate('/login', { replace: true })
      })
  }, [navigate, searchParams, setSession, t])

  return (
    <div className="flex min-h-svh items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3 text-muted">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm">{t('auth.oauth.loading')}</p>
      </div>
    </div>
  )
}
