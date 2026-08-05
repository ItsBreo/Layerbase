/**
 * Variantes de framer-motion compartidas para animaciones de entrada.
 *
 * `staggerContainer` + `fadeUpItem`: un contenedor revela sus hijos en cascada
 * (fade + slide up). Se disparan una vez al montar, así que son ideales para la
 * entrada de una página de detalle (que se monta al navegar a ella).
 */
import type { Variants } from 'framer-motion'

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 210, damping: 24 },
  },
}
