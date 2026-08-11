/**
 * Tipos del dominio de autenticación.
 *
 * El shape de `User` refleja exactamente lo que devuelve `UserResource` del
 * backend (allow-list de campos: nunca llega password ni IDs de OAuth).
 */

export type UserRole = 'user' | 'author' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  avatar_url: string | null
  bio: string | null
  website: string | null
  github_username: string | null
  twitter_username: string | null
  stripe_onboarded: boolean
  banned: boolean
  /** Solo presente para el propio usuario o un admin. */
  ban_reason?: string | null
  email_verified_at: string | null
  created_at: string
  /** Ajuste propio: ¿el resumen de autor es visible para terceros? */
  stats_public?: boolean
  /** false en cuentas creadas por OAuth (no tienen contraseña local). */
  has_password?: boolean
  /** Solo lo devuelven los endpoints de perfil, nunca los listados. */
  stats?: AuthorStats
}

/** Resumen de autor, calculado sobre los componentes publicados. */
export interface AuthorStats {
  components: number
  downloads: number
  rating_avg: number | null
  rating_count: number
}

/** Campos editables del perfil público. */
export interface UpdateProfilePayload {
  name?: string
  bio?: string | null
  website?: string | null
  github_username?: string | null
  twitter_username?: string | null
  stats_public?: boolean
}

export interface UpdatePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

/** Estado de la sesión: arrancando, invitado o autenticado. */
export type AuthStatus = 'loading' | 'guest' | 'authenticated'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

/** Respuesta de los endpoints que emiten token (login / register). */
export interface AuthTokenResponse {
  token: string
  user: User
}

/** Proveedores OAuth soportados por el backend. */
export type OAuthProvider = 'github' | 'google'
