/**
 * Mapea los errores de validación 422 de Laravel a los campos de react-hook-form.
 * Devuelve true si encontró errores de campo (para no duplicar con un toast).
 */
import axios from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { LaravelValidationError } from '@/lib/api'

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) {
    return false
  }

  const data = error.response.data as Partial<LaravelValidationError>
  if (!data.errors) return false

  for (const [field, messages] of Object.entries(data.errors)) {
    if (messages[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] })
    }
  }
  return true
}
