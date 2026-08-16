/**
 * Resultado de la verificación de email.
 *
 * A esta página se llega REDIRIGIDO desde el backend, no navegando: el enlace
 * del correo apunta a una ruta firmada de la API, que verifica y manda aquí con
 * `?status=`. El mismo patrón que usa el callback de OAuth. Por eso la página
 * no llama a nada: cuando se monta, el trabajo ya está hecho.
 */
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CircleCheck, CircleX, Info } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n/useI18n'

type Status = 'success' | 'already' | 'invalid'

const ICONS: Record<Status, typeof CircleCheck> = {
  success: CircleCheck,
  already: Info,
  invalid: CircleX,
}

const TONES: Record<Status, string> = {
  success: 'text-success',
  already: 'text-muted',
  invalid: 'text-danger',
}

export default function VerifyEmail() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const { isAuthenticated, refresh } = useAuth()

  const raw = params.get('status')
  const status: Status = raw === 'success' || raw === 'already' ? raw : 'invalid'

  // Si hay sesión abierta, su copia del usuario todavía dice que el email no
  // está verificado. Se refresca para que el aviso del dashboard desaparezca
  // sin tener que cerrar sesión.
  useEffect(() => {
    if (status === 'success' && isAuthenticated) void refresh()
  }, [status, isAuthenticated, refresh])

  const Icon = ICONS[status]

  return (
    <AppShell>
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <Icon className={`mx-auto size-10 ${TONES[status]}`} />
          <AccentedTitle text={t(`verifyEmail.${status}.title`)} className="mt-6 text-3xl" />
          <p className="mt-3 text-muted">{t(`verifyEmail.${status}.body`)}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link to={isAuthenticated ? '/dashboard' : '/login'}>
              <Button>{t(isAuthenticated ? 'verifyEmail.toDashboard' : 'verifyEmail.toLogin')}</Button>
            </Link>
            <Link to="/components">
              <Button variant="ghost">{t('verifyEmail.toExplore')}</Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </AppShell>
  )
}
