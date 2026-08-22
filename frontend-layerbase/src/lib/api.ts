/**
 * Cliente HTTP central de Layerbase.
 *
 * - baseURL: ver `resolveBaseUrl()` justo debajo.
 * - Auth por token Bearer de Sanctum: el interceptor de request inyecta el
 *   token guardado en cada llamada.
 * - El interceptor de response detecta 401 (sesión inválida/expirada), limpia
 *   el token y emite el evento `auth:unauthorized` para que el AuthContext
 *   degrade al usuario a invitado sin acoplar este módulo a React.
 */
import axios, { AxiosError } from 'axios'
import { clearToken, getToken } from '@/lib/token'

export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

/**
 * En local se deja `/api` relativo y lo proxya Vite hacia el backend (ver
 * `vite.config.ts`), así no hay CORS de por medio.
 *
 * Desplegado eso no vale: el SPA es HTML estático servido desde su propio
 * dominio, así que `/api` pegaría contra el dominio del FRONTEND, donde no hay
 * backend que responda. `VITE_API_URL` lleva el origen del backend (la URL del
 * servicio, sin `/api`: el sufijo lo pone esta función).
 *
 * Es una variable de BUILD, no de ejecución: Vite la incrusta al compilar, así
 * que cambiarla obliga a volver a construir el frontend.
 */
function resolveBaseUrl(): string {
  const configurada = import.meta.env.VITE_API_URL?.trim()

  if (!configurada) {
    return '/api'
  }

  return `${configurada.replace(/\/+$/, '')}/api`
}

/**
 * Base de la API ya resuelta. Se exporta porque no todo pasa por axios: el
 * inicio de sesión con GitHub/Google es una navegación completa del navegador
 * (`window.location.assign`), y esa URL también tiene que apuntar al backend.
 */
export const API_BASE_URL = resolveBaseUrl()

export const api = axios.create({
  baseURL: API_BASE_URL,
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
