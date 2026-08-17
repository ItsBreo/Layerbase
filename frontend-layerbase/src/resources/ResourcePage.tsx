/**
 * Páginas de Recursos: documentación, cómo publicar y buenas prácticas.
 *
 * A diferencia de las legales (`src/legal/`), aquí el contenido SÍ está escrito:
 * sale del propio código, no de obligaciones jurídicas. Por eso ninguna sección
 * nace vacía ni hay aviso de borrador.
 *
 * El cuerpo de cada sección se escribe como Markdown en `messages.ts` y se
 * renderiza con `<MarkdownBody>`, el mismo componente que pinta el README de un
 * componente en su ficha. Así se pueden usar listas, negritas, código y tablas
 * sin inventar un sistema de bloques, y las traducciones siguen viviendo en un
 * único sitio.
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { useI18n } from '@/i18n/useI18n'
import { fadeUpItem, staggerContainer } from '@/lib/motion'
import { MarkdownBody } from '@/studio/MarkdownEditor'

/** Enlaces entre las tres páginas, para saltar de una a otra al terminar. */
const RESOURCES = [
  { doc: 'docs', to: '/resources/docs' },
  { doc: 'publishing', to: '/resources/publishing' },
  { doc: 'bestPractices', to: '/resources/best-practices' },
] as const

/**
 * Lleva a una sección con scroll animado en vez del salto seco del ancla.
 *
 * Se intercepta el click (el `href` se conserva para que el enlace siga siendo
 * un enlace de verdad: se puede abrir en otra pestaña y se copia bien). El hash
 * se escribe con `replaceState` y no navegando, porque navegar volvería a
 * provocar el salto instantáneo que queremos evitar.
 *
 * Respeta `prefers-reduced-motion`: a quien pide menos movimiento por el sistema
 * se le lleva igual, pero sin animar.
 */
function scrollToSection(event: React.MouseEvent<HTMLAnchorElement>, id: string): void {
  const target = document.getElementById(id)
  if (!target) return // Sin destino, que actúe el ancla normal.

  event.preventDefault()

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })

  window.history.replaceState(null, '', `#${id}`)
}

export function ResourcePage({ doc, sections }: { doc: string; sections: string[] }) {
  const { t } = useI18n()

  return (
    <AppShell>
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-3xl px-6 py-12"
      >
        <motion.div variants={fadeUpItem}>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            {t('resources.eyebrow')}
          </p>
          <AccentedTitle text={t(`resources.${doc}.title`)} className="mt-2 text-4xl" />
          <p className="mt-3 text-lg text-muted">{t(`resources.${doc}.intro`)}</p>
        </motion.div>

        {/* Índice. Con secciones largas, saber qué hay antes de bajar ahorra
            scroll a ciegas. */}
        <motion.nav
          variants={fadeUpItem}
          className="mt-8 rounded-lg border border-border bg-surface/60 p-4"
        >
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
            {t('resources.contents')}
          </p>
          <ol className="mt-3 space-y-1.5">
            {sections.map((key, index) => (
              <li key={key}>
                <a
                  href={`#${key}`}
                  onClick={(event) => scrollToSection(event, key)}
                  className="text-sm text-muted transition hover:text-accent"
                >
                  <span className="mr-2 font-mono text-xs">{index + 1}.</span>
                  {t(`resources.${doc}.sections.${key}`)}
                </a>
              </li>
            ))}
          </ol>
        </motion.nav>

        <div className="mt-10 space-y-12">
          {sections.map((key, index) => (
            // scroll-mt: el ancla no se queda pegada al borde superior.
            <motion.section variants={fadeUpItem} key={key} id={key} className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-text">
                <span className="mr-2 font-mono text-sm text-muted">{index + 1}.</span>
                {t(`resources.${doc}.sections.${key}`)}
              </h2>
              <div className="mt-3 text-muted">
                <MarkdownBody source={t(`resources.${doc}.content.${key}`)} />
              </div>
            </motion.section>
          ))}
        </div>

        <motion.nav variants={fadeUpItem} className="mt-14 border-t border-border pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
            {t('resources.keepReading')}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {RESOURCES.filter((r) => r.doc !== doc).map((r) => (
              <Link key={r.doc} to={r.to} className="text-sm text-accent hover:underline">
                {t(`resources.${r.doc}.title`)}
              </Link>
            ))}
          </div>
        </motion.nav>
      </motion.main>
    </AppShell>
  )
}
