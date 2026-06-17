/**
 * Persistencia del token de Sanctum (Bearer) en localStorage.
 *
 * Se aísla en su propio módulo para evitar dependencias circulares entre el
 * cliente axios (`lib/api.ts`) y el contexto de auth (`auth/AuthContext.tsx`):
 * ambos leen/escriben el token a través de aquí.
 */

const TOKEN_KEY = 'layerbase_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // localStorage puede no estar disponible (SSR, modo privado, etc.)
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* noop */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}
