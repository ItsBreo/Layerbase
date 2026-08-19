/**
 * Navegación entre secciones del panel de admin.
 *
 * Va dentro de la página (no en el rail lateral) porque el rail navega entre
 * ZONAS de la app y esto es navegación dentro de una sola zona. El rail sigue
 * teniendo una única entrada "Admin".
 */
import { NavLink } from 'react-router-dom'
import { ChartLine, Library, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

interface Section {
  to: string
  label: string
  icon: LucideIcon
  /** `end` evita que /admin quede activo también en /admin/users. */
  end?: boolean
}

export function AdminNav() {
  const { t } = useI18n()

  const sections: Section[] = [
    { to: '/admin', label: t('admin.sections.moderation'), icon: ShieldCheck, end: true },
    { to: '/admin/users', label: t('admin.sections.users'), icon: Users },
    { to: '/admin/metrics', label: t('admin.sections.metrics'), icon: ChartLine },
    { to: '/admin/catalog', label: t('admin.sections.catalog'), icon: Library },
  ]

  return (
    <nav className="mt-8 flex flex-wrap gap-1 border-b border-border">
      {sections.map((section) => {
        const Icon = section.icon
        return (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) =>
              cn(
                // -mb-px hace que el borde inferior activo tape el de la nav.
                '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-text',
              )
            }
          >
            <Icon className="size-4" />
            {section.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
