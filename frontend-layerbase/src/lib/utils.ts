import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Une clases condicionales (clsx) y resuelve conflictos de Tailwind
 * (tailwind-merge), p. ej. `cn('px-2', condicion && 'px-4')` -> `px-4`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
