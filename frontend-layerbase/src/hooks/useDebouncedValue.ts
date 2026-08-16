/**
 * Retrasa la propagación de un valor hasta que deja de cambiar durante `delay`.
 *
 * Se usa en los campos de búsqueda: sin esto, cada tecla pulsada dispararía una
 * petición al backend. El valor devuelto es el que debe alimentar la query, no
 * el que se pinta en el input (ese sigue siendo inmediato).
 */
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}
