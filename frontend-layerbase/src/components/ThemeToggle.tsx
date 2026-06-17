/**
 * Botón de cambio de tema (claro/oscuro) con transición suave (ver useTheme).
 */
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      title={isDark ? t('theme.toLight') : t('theme.toDark')}
      className={cn(
        'flex size-9 items-center justify-center rounded-pill border border-border bg-surface/60 text-muted backdrop-blur transition hover:border-accent hover:text-text',
        className,
      )}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
