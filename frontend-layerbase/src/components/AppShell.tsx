/**
 * Estructura base de las páginas "de aplicación":
 * - Fondo animado.
 * - TopNav horizontal (funciones globales) en flujo, pegajoso arriba.
 * - SideNav vertical flotante (secciones), no empuja el contenido; en md+
 *   añadimos padding izquierdo para que el contenido no quede bajo el rail.
 */
import type { ReactNode } from 'react'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { SideNav } from '@/components/SideNav'
import { TopNav } from '@/components/TopNav'
import { cn } from '@/lib/utils'

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-bg">
      <AnimatedBackground />
      <SideNav />
      <div className="relative z-10">
        <TopNav />
        <div className={cn('md:pl-24', className)}>{children}</div>
      </div>
    </div>
  )
}
