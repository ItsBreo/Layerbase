/**
 * Cliente HTTP central de Layerbase.
 *
 * - baseURL `/api`: en local Vite lo proxya a `http://localhost:8000` (ver
 *   `vite.config.ts`), así no hay problemas de CORS.
 * - Auth por token Bearer de Sanctum: el interceptor de request inyecta el
 *   token guardado en cada llamada.
 * - El interceptor de response detecta 401 (sesión inválida/expirada), limpia
 *   el token y emite el evento `auth:unauthorized` para que el AuthContext
 *   degrade al usuario a invitado sin acoplar este módulo a React.
 */
import axios, { AxiosError } from 'axios'
import { clearToken, getToken } from '@/lib/token'

export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Inyecta el Bearer token en cada petición si existe.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Maneja respuestas de error globalmente.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && getToken()) {
      // Token inválido o expirado: limpiamos y avisamos a la app.
      clearToken()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

/**
 * Forma de los errores de validación de Laravel (422):
 * `{ message, errors: { campo: [mensajes] } }`.
 */
export interface LaravelValidationError {
  message: string
  errors: Record<string, string[]>
}

/** Extrae un mensaje legible de un error de axios para mostrar en un toast. */
export function getErrorMessage(error: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<LaravelValidationError> | undefined
    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (first?.[0]) return first[0]
    }
    if (data?.message) return data.message
  }
  return fallback
}
