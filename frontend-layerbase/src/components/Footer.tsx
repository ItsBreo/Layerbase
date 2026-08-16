/**
 * Pie de página global de la app (se monta en AppShell).
 *
 * Estructura profesional de marketplace: columna de marca + tagline + redes,
 * y tres columnas de enlaces (Producto / Recursos / Legal). Los enlaces internos
 * usan `Link`; los de páginas aún no construidas (docs, legal…) son PLACEHOLDERS
 * (`#`) a la espera de sus rutas. Barra inferior con copyright.
 */
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { BrandWordmark } from '@/components/Brand'
import { GithubIcon, LinkedinIcon, XIcon } from '@/components/icons/BrandIcons'
import { useI18n } from '@/i18n/useI18n'

interface FooterLink {
  label: string
  /** Ruta interna (empieza por '/') o '#' para placeholder pendiente. */
  to: string
}

export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  const columns: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.links.explore'), to: '/components' },
        { label: t('footer.links.publish'), to: '/studio/new' },
        { label: t('footer.links.dashboard'), to: '/dashboard' },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('footer.links.docs'), to: '#' },
        { label: t('footer.links.tutorials'), to: '#' },
        { label: t('footer.links.bestPractices'), to: '#' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.links.terms'), to: '/legal/terms' },
        { label: t('footer.links.privacy'), to: '/legal/privacy' },
        { label: t('footer.links.billing'), to: '/legal/billing' },
        { label: t('footer.links.cookies'), to: '/legal/cookies' },
      ],
    },
  ]

  const socials: Array<{ icon: ComponentType<{ className?: string }>; label: string; href: string }> = [
    { icon: GithubIcon, label: 'GitHub', href: '#' },
    { icon: XIcon, label: 'X', href: '#' },
    { icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
  ]

  return (
    <footer className="mt-16 border-t border-border bg-surface/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Marca */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" aria-label="Layerbase" className="inline-block">
              <BrandWordmark className="h-6 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {t('footer.tagline')}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="grid size-9 place-items-center rounded-full border border-border text-muted transition hover:border-accent hover:text-accent"
                  >
                    <Icon className="size-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Columnas de enlaces */}
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-text">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Barra inferior */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <p>{t('footer.rights', { year })}</p>
          <p className="font-mono">{t('footer.madeWith')}</p>
        </div>
      </div>
    </footer>
  )
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    'text-sm text-muted transition hover:text-text'
  // Placeholder (aún sin página): ancla que no navega.
  if (link.to === '#') {
    return (
      <a href="#" className={className}>
        {link.label}
      </a>
    )
  }
  return (
    <Link to={link.to} className={className}>
      {link.label}
    </Link>
  )
}
