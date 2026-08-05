/**
 * Fondo animado reutilizable (inspirado en "The Infinite Grid").
 *
 * - Una rejilla muy tenue que se desplaza infinitamente.
 * - Una segunda capa de rejilla más marcada que solo se revela alrededor del
 *   cursor (máscara radial), lo que da una sensación viva sin saturar.
 * - Halos de color difuminados con los tonos de marca (accent / navy).
 *
 * Es puramente decorativo: `pointer-events-none` y `aria-hidden`, pensado para
 * colocarse como primera capa dentro de un contenedor `relative`. Adaptado a
 * los tokens del design system (usa `currentColor` sobre `text-muted`).
 */
import { useEffect, useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  type MotionValue,
} from 'framer-motion'
import { cn } from '@/lib/utils'

const CELL = 40
const SPEED = 0.4

export function AnimatedBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(-1000)
  const mouseY = useMotionValue(-1000)

  const offsetX = useMotionValue(0)
  const offsetY = useMotionValue(0)

  // Desplazamiento infinito de la rejilla.
  useAnimationFrame(() => {
    offsetX.set((offsetX.get() + SPEED) % CELL)
    offsetY.set((offsetY.get() + SPEED) % CELL)
  })

  // Sigue el cursor en coordenadas relativas al contenedor.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mouseX, mouseY])

  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black, transparent)`

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* Capa base tenue */}
      <div className="absolute inset-0 text-muted opacity-[0.07]">
        <GridPattern offsetX={offsetX} offsetY={offsetY} />
      </div>

      {/* Capa revelada por el cursor */}
      <motion.div
        className="absolute inset-0 text-text opacity-30"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={offsetX} offsetY={offsetY} />
      </motion.div>

      {/* Halos de color de marca. El inferior usa `navy-mid` (azul profundo,
          token decorativo) para no lavarse tras aclarar `--navy` en oscuro. */}
      <div className="absolute right-[-15%] top-[-20%] size-[45%] rounded-full bg-accent/20 blur-[130px]" />
      <div className="absolute left-[-15%] bottom-[-25%] size-[45%] rounded-full bg-navy-mid/25 blur-[130px]" />
    </div>
  )
}

function GridPattern({ offsetX, offsetY }: { offsetX: MotionValue<number>; offsetY: MotionValue<number> }) {
  return (
    <svg className="size-full">
      <defs>
        <motion.pattern
          id="layerbase-grid"
          width={CELL}
          height={CELL}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="currentColor" strokeWidth="1" />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#layerbase-grid)" />
    </svg>
  )
}
