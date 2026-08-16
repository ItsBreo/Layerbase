/**
 * Contexto de autenticación de Layerbase.
 *
 * Mantiene la sesión actual (invitado o registrado) y la expone a toda la app.
 * - Al montar, si hay token guardado intenta recuperar el usuario (`/auth/me`).
 * - Escucha el evento `auth:unauthorized` que emite el cliente axios cuando un
 *   token caduca, para degradar a invitado sin recargar la página.
 *
 * El token vive en localStorage (via `lib/token`); aquí solo vive el usuario.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/Login/auth'
import { UNAUTHORIZED_EVENT } from '@/lib/api'
import { clearToken, getToken, setToken } from '@/lib/token'
import { AuthContext, type AuthContextValue } from '@/auth/useAuth'
import type { AuthStatus, LoginCredentials, RegisterPayload, User, UserRole } from '@/auth/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Estado inicial derivado del token: sin token no hay nada que resolver y la
  // sesión ya es 'guest'. Arrancar siempre en 'loading' obligaba a corregirlo
  // con un setState síncrono dentro del efecto, que dispara renders en cascada.
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'loading' : 'guest'))

  const applyUser = useCallback((next: User | null) => {
    setUser(next)
    setStatus(next ? 'authenticated' : 'guest')
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) {
      applyUser(null)
      return
    }
    try {
      applyUser(await authApi.me())
    } catch {
      // Token inválido/caducado: limpiamos y quedamos como invitado.
      clearToken()
      applyUser(null)
    }
  }, [applyUser])

  const setSession = useCallback(
    async (token: string) => {
      setToken(token)
      await refresh()
    },
    [refresh],
  )

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { token, user: authUser } = await authApi.login(credentials)
      setToken(token)
      applyUser(authUser)
    },
    [applyUser],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { token, user: authUser } = await authApi.register(payload)
      setToken(token)
      applyUser(authUser)
    },
    [applyUser],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Aunque el backend falle, cerramos sesión localmente.
    } finally {
      clearToken()
      applyUser(null)
    }
  }, [applyUser])

  /*
   * Bootstrap de la sesión al cargar la app.
   *
   * No reutiliza `refresh()` porque este actualiza el estado de forma SÍNCRONA
   * en su camino "sin token", y hacer eso dentro de un efecto encadena renders.
   * Aquí solo se entra habiendo token, así que el estado se toca únicamente
   * después del await, y con guarda de cancelación para no escribir sobre un
   * provider ya desmontado.
   */
  useEffect(() => {
    if (!getToken()) return

    let cancelled = false

    void (async () => {
      try {
        const me = await authApi.me()
        if (!cancelled) applyUser(me)
      } catch {
        // Token inválido o caducado: se limpia y quedamos como invitado.
        clearToken()
        if (!cancelled) applyUser(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyUser])

  // Reacciona a tokens invalidados detectados por el interceptor de axios.
  useEffect(() => {
    const onUnauthorized = () => applyUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [applyUser])

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...roles: UserRole[]) =>
      user != null && (user.role === 'admin' || roles.includes(user.role))

    return {
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      isGuest: status === 'guest',
      isAdmin: user?.role === 'admin',
      hasRole,
      login,
      register,
      logout,
      refresh,
      setSession,
    }
  }, [user, status, login, register, logout, refresh, setSession])

  return <AuthContext value={value}>{children}</AuthContext>
}
