/**
 * Logotipos corporativos (SVG en /public) que cambian según el tema.
 * - BrandMark: el isotipo (favicon) cuadrado.
 * - BrandWordmark: el logotipo "Layerbase" completo.
 */
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  const theme = useTheme((s) => s.theme)
  const src = theme === 'dark' ? '/layerbase_favicon_dark.svg' : '/layerbase_favicon.svg'
  return <img src={src} alt="Layerbase" className={cn('select-none', className)} draggable={false} />
}

export function BrandWordmark({ className }: { className?: string }) {
  const theme = useTheme((s) => s.theme)
  const src = theme === 'dark' ? '/layerbase_wordmark_dark.svg' : '/layerbase_wordmark.svg'
  return <img src={src} alt="Layerbase" className={cn('select-none', className)} draggable={false} />
}
