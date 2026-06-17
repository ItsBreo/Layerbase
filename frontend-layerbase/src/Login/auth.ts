/**
 * Servicio de autenticación: la única capa que conoce los endpoints REST de
 * `/api/auth`. Los componentes y el AuthContext consumen estas funciones, no
 * axios directamente, para mantener el contrato en un solo sitio.
 */
import { api } from '@/lib/api'
import type {
  AuthTokenResponse,
  LoginCredentials,
  OAuthProvider,
  RegisterPayload,
  User,
} from '@/auth/types'

export const authApi = {
  /** Crea una cuenta y devuelve token + usuario. */
  async register(payload: RegisterPayload): Promise<AuthTokenResponse> {
    const { data } = await api.post<AuthTokenResponse>('/auth/register', payload)
    return data
  },

  /** Inicia sesión con email + contraseña. */
  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    const { data } = await api.post<AuthTokenResponse>('/auth/login', credentials)
    return data
  },

  /** Revoca el token actual en el servidor. */
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  /** Devuelve el usuario autenticado actual (requiere token). */
  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  /** Solicita el email de restablecimiento de contraseña. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
    return data
  },

  /** Restablece la contraseña con el token recibido por email. */
  async resetPassword(payload: {
    token: string
    email: string
    password: string
    password_confirmation: string
  }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', payload)
    return data
  },

  /**
   * URL absoluta del inicio de flujo OAuth. Se navega con el navegador
   * completo (no axios), porque implica redirecciones cross-origin.
   */
  oauthRedirectUrl(provider: OAuthProvider): string {
    return `/api/auth/${provider}/redirect`
  },
}
