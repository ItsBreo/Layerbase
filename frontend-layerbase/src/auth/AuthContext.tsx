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
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '@/Login/auth'
import { UNAUTHORIZED_EVENT } from '@/lib/api'
import { clearToken, getToken, setToken } from '@/lib/token'
import type {
  AuthStatus,
  LoginCredentials,
  RegisterPayload,
  User,
  UserRole,
} from '@/auth/types'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
  isGuest: boolean
  isAdmin: boolean
  /** ¿El usuario tiene alguno de los roles indicados? (admin siempre pasa) */
  hasRole: (...roles: UserRole[]) => boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  /** Recupera el usuario actual desde el backend (tras OAuth, p. ej.). */
  refresh: () => Promise<void>
  /** Establece la sesión a partir de un token (callback de OAuth). */
  setSession: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

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

  // Bootstrap de la sesión al cargar la app.
  useEffect(() => {
    void refresh()
  }, [refresh])

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

/** Hook de acceso a la sesión. Lanza si se usa fuera del AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return ctx
}
