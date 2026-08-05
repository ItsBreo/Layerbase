/**
 * Estructura base de las páginas "de aplicación":
 * - Fondo animado.
 * - TopNav horizontal (funciones globales) en flujo, pegajoso arriba.
 * - SideNav vertical flotante (secciones), no empuja el contenido; en md+
 *   añadimos padding izquierdo para que el contenido no quede bajo el rail.
 */
import type { ReactNode } from 'react'
import { AnimatedBackground } from '@/components/AnimatedBackground'
import { Footer } from '@/components/Footer'
import { SideNav } from '@/components/SideNav'
import { TopNav } from '@/components/TopNav'
import { cn } from '@/lib/utils'

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-bg">
      <AnimatedBackground />
      <SideNav />
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Header y footer van a ancho completo (centrados respecto a la ventana).
            Solo el CONTENIDO lleva el `md:pl-24` que deja hueco al rail flotante
            —el rail está centrado en vertical, así que abajo no estorba al footer.
            flex-1 en el contenido empuja el footer al fondo en páginas cortas. */}
        <TopNav />
        <div className={cn('flex-1 md:pl-24', className)}>{children}</div>
        <Footer />
      </div>
    </div>
  )
}
