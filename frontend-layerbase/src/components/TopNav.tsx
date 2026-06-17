/**
 * Barra horizontal superior: funciones globales de la app.
 * - Izquierda: logotipo (wordmark) que enlaza al inicio.
 * - Derecha: selector de idioma, cambio de tema y sesión (login/registro o
 *   nombre + cerrar sesión).
 *
 * El SideNav vertical queda reservado para las secciones de la página.
 */
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n/useI18n'
import { BrandWordmark } from '@/components/Brand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'

export function TopNav() {
  const { isAuthenticated, user, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success(t('common.logoutSuccess'))
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" aria-label="Layerbase" className="shrink-0">
          <BrandWordmark className="h-5 w-auto md:h-6" />
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted sm:inline">{user?.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="min-w-[8.5rem] rounded-pill border border-border bg-surface/60 px-3.5 py-1.5 text-center text-sm font-semibold text-text backdrop-blur transition hover:border-accent active:scale-[0.98]"
              >
                {t('top.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                to="/login"
                className="hidden min-w-[7rem] px-2 text-center text-sm font-medium text-muted transition hover:text-text sm:inline-block"
              >
                {t('top.login')}
              </Link>
              <Link
                to="/register"
                className="inline-flex min-w-[8.5rem] justify-center rounded-pill bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
              >
                {t('top.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
