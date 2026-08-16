/**
 * Contexto de sesión y hook de acceso.
 *
 * Vive aparte de `AuthContext.tsx` a propósito: ese fichero solo puede exportar
 * componentes o Fast Refresh deja de funcionar en él (regla
 * `react-refresh/only-export-components`). Aquí van el objeto de contexto, su
 * tipo y el hook; allí queda únicamente el `<AuthProvider>`.
 */
import { createContext, use } from 'react'
import type { AuthStatus, LoginCredentials, RegisterPayload, User, UserRole } from '@/auth/types'

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Hook de acceso a la sesión. Lanza si se usa fuera del AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return ctx
}
