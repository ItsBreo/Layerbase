/**
 * Andamiaje de las páginas legales.
 *
 * El contenido jurídico NO está escrito: son textos que obligan legalmente a
 * Layerbase y dependen de datos de la empresa (razón social, domicilio, CIF,
 * encargados de tratamiento, pasarela de pago). Aquí está la estructura, las
 * rutas y la navegación; el texto lo rellena quien pueda responder por él.
 *
 * Cada sección sin redactar se marca en pantalla con un aviso VISIBLE, para que
 * ninguna de estas páginas pueda publicarse por descuido con contenido falso.
 * Cuando se rellene una sección, basta con quitar su `pending`.
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { useI18n } from '@/i18n/useI18n'

export interface LegalSection {
  /** Clave i18n del encabezado, bajo `legal.<doc>.sections`. */
  key: string
  /** Sin redactar: pinta el aviso en vez de texto inventado. */
  pending?: boolean
}

export function LegalPage({ doc, sections }: { doc: string; sections: LegalSection[] }) {
  const { t } = useI18n()

  return (
    <AppShell>
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="mx-auto max-w-3xl px-6 py-12"
      >
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
          {t('legal.eyebrow')}
        </p>
        <AccentedTitle text={t(`legal.${doc}.title`)} className="mt-2 text-4xl" />
        <p className="mt-3 text-muted">{t(`legal.${doc}.intro`)}</p>

        {/* Aviso global: mientras queden secciones sin redactar, el documento
            no tiene validez. Es deliberadamente difícil de pasar por alto. */}
        {sections.some((s) => s.pending) && (
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{t('legal.draftWarning')}</p>
          </div>
        )}

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.key}>
              <h2 className="text-xl font-semibold text-text">
                <span className="mr-2 font-mono text-sm text-muted">{index + 1}.</span>
                {t(`legal.${doc}.sections.${section.key}`)}
              </h2>
              {section.pending ? (
                <p className="mt-3 rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-sm text-muted">
                  {t('legal.pendingSection')}
                </p>
              ) : (
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">
                  {t(`legal.${doc}.content.${section.key}`)}
                </p>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-muted">
          {t('legal.contact')}{' '}
          <Link to="/" className="text-accent hover:underline">
            Layerbase
          </Link>
        </p>
      </motion.main>
    </AppShell>
  )
}
