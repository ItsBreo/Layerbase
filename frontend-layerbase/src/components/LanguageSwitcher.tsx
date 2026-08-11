/**
 * Selector de idioma segmentado (ES / EN) con indicador deslizante.
 *
 * La píldora activa se anima entre opciones con `layoutId` (slider). Cada
 * instancia usa un layoutId único (useId) para que dos switchers montados a la
 * vez no compartan la misma animación.
 */
import { useId } from 'react'
import { motion } from 'framer-motion'
import { LANGS } from '@/i18n/messages'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()
  const layoutId = useId()

  return (
    <div
      role="group"
      aria-label="Idioma"
      className={cn(
        // h-9: misma altura que el resto de controles de la barra superior.
        'flex h-9 items-center rounded-pill border border-border bg-surface/60 p-0.5 text-xs font-semibold backdrop-blur',
        className,
      )}
    >
      {LANGS.map((l) => {
        const active = lang === l
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className="relative flex h-8 w-9 items-center justify-center rounded-pill uppercase transition-colors"
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-pill bg-accent"
              />
            )}
            <span className={cn('relative z-10', active ? 'text-white' : 'text-muted')}>{l}</span>
          </button>
        )
      })}
    </div>
  )
}
