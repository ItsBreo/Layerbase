/**
 * Placeholder visual determinista para componentes sin imagen propia.
 *
 * A partir del slug se deriva un degradado estable (mismo componente → mismo
 * color siempre) y, para la rejilla masonry, una altura variable. Lo usan tanto
 * la tarjeta del listado como el detalle, para que un componente sin thumbnail
 * ni preview subidos muestre igualmente un bloque de marca coherente.
 */

/** Hash simple y estable de un string. */
function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Degradado determinista (CSS `background`) a partir del slug. */
export function componentGradient(slug: string): string {
  const hue = hash(slug) % 360
  return `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 28%))`
}

const PLACEHOLDER_HEIGHTS = [180, 220, 260, 300] as const

/** Altura variable (para el efecto masonry de la rejilla). */
export function placeholderHeight(slug: string): number {
  return PLACEHOLDER_HEIGHTS[hash(slug) % PLACEHOLDER_HEIGHTS.length]
}
