/**
 * Barra horizontal superior: funciones globales de la app.
 * - Izquierda: logotipo (wordmark) que enlaza al inicio.
 * - Derecha: dos grupos separados por un divisor — ajustes (idioma, tema) y
 *   sesión (identidad + salir, o login/registro).
 *
 * Todos los controles miden `h-9`: la barra se lee como una sola línea de
 * píldoras. El usuario tiene su propio control (`UserChip`) en vez de flotar
 * como texto suelto entre dos botones, y enlaza al dashboard.
 *
 * Salir es un icono: la única etiqueta de texto que queda a la derecha es el
 * nombre del usuario, así que la barra no cambia de ancho al cambiar de idioma.
 *
 * El SideNav vertical queda reservado para las secciones de la página.
 */
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useI18n } from '@/i18n/useI18n'
import { BrandWordmark } from '@/components/Brand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/notifications/NotificationBell'

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
          {/* Ajustes */}
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Divisor: separa ajustes de sesión, que son dos cosas distintas. */}
          <span aria-hidden className="h-5 w-px bg-border" />

          {/* Sesión */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* Va con la sesión, no con los ajustes: sin cuenta no hay nada
                  que notificar. */}
              <NotificationBell />
              <UserChip name={user?.name ?? ''} avatarUrl={user?.avatar_url} />
              {/* Icono, no texto: evita que la barra cambie de ancho entre ES
                  ("Cerrar sesión") y EN ("Sign out"). El nombre accesible va en
                  aria-label + title. */}
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t('top.logout')}
                title={t('top.logout')}
                className="control-raised flex size-9 items-center justify-center rounded-pill border border-border text-muted transition-colors hover:border-accent hover:text-text"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden h-9 min-w-[7rem] items-center justify-center px-2 text-sm font-medium text-muted transition-colors hover:text-text sm:inline-flex"
              >
                {t('top.login')}
              </Link>
              <Link
                to="/register"
                className="control-raised-accent inline-flex h-9 min-w-[8.5rem] items-center justify-center rounded-pill px-3.5 text-sm font-semibold text-white"
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

/**
 * Identidad de la sesión: avatar + nombre dentro de una píldora, con el mismo
 * lenguaje que el resto de controles de la barra. Enlaza al dashboard, así que
 * es un destino y no un adorno. En móvil se queda solo el avatar.
 */
function UserChip({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <Link
      to="/dashboard"
      title={name}
      className="flex h-9 items-center gap-2 rounded-pill border border-border bg-surface/60 p-1 backdrop-blur transition-colors hover:border-accent sm:pr-3.5"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-7 rounded-full object-cover" />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-navy-50 font-display text-xs font-bold text-navy">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden font-display text-sm font-semibold text-navy sm:inline">{name}</span>
    </Link>
  )
}
