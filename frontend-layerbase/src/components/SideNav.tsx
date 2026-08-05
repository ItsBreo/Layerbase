/**
 * Navbar vertical flotante (lado izquierdo) — navegación por SECCIONES.
 *
 * - Flotante (`fixed`): no altera el flujo del documento.
 * - Entra deslizándose desde la izquierda al montar; colapsado muestra solo
 *   iconos y se expande al pasar el cursor revelando las etiquetas.
 * - Las funciones globales (sesión, tema, idioma) viven en el TopNav. Aquí solo
 *   van las secciones de la página, que crecerán conforme se construya la app.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Compass, Home, LayoutDashboard, Package, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export function SideNav() {
  const [expanded, setExpanded] = useState(false)
  const { isAuthenticated, isAdmin } = useAuth()
  const { t } = useI18n()

  const items: NavItem[] = [
    { to: '/', label: t('nav.home'), icon: Home, end: true },
    { to: '/components', label: t('explore.nav'), icon: Compass },
  ]
  if (isAuthenticated) {
    items.push({ to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard })
    items.push({ to: '/studio', label: t('studio.nav'), icon: Package })
    if (isAdmin) items.push({ to: '/admin', label: t('nav.admin'), icon: ShieldCheck })
  }

  return (
    <motion.nav
      initial={{ x: -32, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: expanded ? 200 : 64 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed left-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-1 overflow-hidden rounded-2xl border border-border bg-surface/70 p-2 shadow-elevated backdrop-blur-xl md:flex"
    >
      {items.map((item, i) => (
        <RailLink key={item.to} item={item} expanded={expanded} index={i} />
      ))}
    </motion.nav>
  )
}

function RailLink({ item, expanded, index }: { item: NavItem; expanded: boolean; index: number }) {
  const Icon = item.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      <NavLink
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cn(
            'flex h-11 items-center gap-3 rounded-xl px-3 transition-colors',
            isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-bg hover:text-text',
          )
        }
      >
        <Icon className="size-5 shrink-0" />
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap text-sm font-medium"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    </motion.div>
  )
}
