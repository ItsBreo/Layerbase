/**
 * Guards de rutas basados en la sesión.
 *
 * - <ProtectedRoute>  exige usuario autenticado (cualquier rol).
 * - <GuestRoute>      solo para invitados (p. ej. /login, /register).
 * - <RoleRoute roles> exige uno de los roles indicados (admin siempre pasa).
 * - <AdminRoute>      atajo de RoleRoute para 'admin'.
 *
 * Se usan como elementos envolventes con <Outlet/> en el árbol de rutas.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import type { UserRole } from '@/auth/types'

/** Pantalla mientras se resuelve la sesión inicial (evita parpadeos/redirecciones falsas). */
function AuthLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg">
      <div
        className="size-8 animate-spin rounded-full border-2 border-border border-t-accent"
        role="status"
        aria-label="Cargando"
      />
    </div>
  )
}

/** Exige sesión iniciada; si no, manda a /login recordando el destino. */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) return <AuthLoading />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

/** Solo invitados; un usuario ya autenticado se redirige fuera. */
export function GuestRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) return <AuthLoading />
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from
    return <Navigate to={from?.pathname ?? '/dashboard'} replace />
  }
  return <Outlet />
}

/** Exige uno de los roles. Invitado -> login; autenticado sin rol -> 403. */
export function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { isLoading, isAuthenticated, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) return <AuthLoading />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!hasRole(...roles)) {
    return <Forbidden />
  }
  return <Outlet />
}

/** Atajo: rutas solo para administradores. */
export function AdminRoute() {
  return <RoleRoute roles={['admin']} />
}

function Forbidden() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="font-mono text-sm text-accent">403</p>
      <h1>No tienes acceso a esta página</h1>
      <p className="text-muted">Tu cuenta no tiene permisos para ver esta sección.</p>
      <a href="/" className="mt-2 text-accent hover:underline">
        Volver al inicio
      </a>
    </div>
  )
}
