/**
 * Perfil público de un autor: quién es y qué ha publicado.
 *
 * Es lo que le faltaba a `stats_public`. Existían la columna, el conmutador del
 * dashboard y la lógica del backend para enseñar el resumen a terceros, pero no
 * había página donde verlo: el ajuste no hacía nada.
 *
 * El resumen puede no venir (el autor no lo ha publicado y quien mira no es él
 * ni un admin). En ese caso simplemente no se pinta: no se avisa de que existe
 * pero está oculto, porque eso ya sería filtrar algo del autor.
 */
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Globe, Layers, Star } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GithubIcon, XIcon } from '@/components/icons/BrandIcons'
import { Skeleton } from '@/components/ui/Skeleton'
import { Masonry } from '@/components/ui/Masonry'
import { useI18n } from '@/i18n/useI18n'
import { fadeUpItem, staggerContainer } from '@/lib/motion'
import { ComponentCard } from '@/studio/ComponentCard'
import { usePublicProfile, usePublicProfileComponents } from '@/profile/hooks'
import type { User } from '@/auth/types'

export default function PublicProfile() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, isError } = usePublicProfile(id)
  const { data: components } = usePublicProfileComponents(id)

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-6 py-12">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="mt-8 h-64 rounded-xl" />
        </main>
      </AppShell>
    )
  }

  // Incluye tanto la cuenta inexistente como la suspendida: el backend
  // responde 404 en ambos casos a propósito.
  if (isError || !user) {
    return (
      <AppShell>
        <main className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-3xl">{t('publicProfile.notFound.title')}</h1>
          <p className="mt-3 text-muted">{t('publicProfile.notFound.body')}</p>
          <Link to="/components" className="mt-6 inline-block text-accent hover:underline">
            {t('publicProfile.notFound.back')}
          </Link>
        </main>
      </AppShell>
    )
  }

  const items = components?.data ?? []

  return (
    <AppShell>
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-6 py-12"
      >
        <motion.header variants={fadeUpItem} className="flex flex-wrap items-start gap-5">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            {/* Los nombres de usuario van SIEMPRE en Syne. */}
            <h1 className="font-display text-3xl font-bold text-text">{user.name}</h1>
            {user.bio && <p className="mt-2 max-w-2xl text-muted">{user.bio}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              {user.website && (
                <ExternalLink href={user.website} icon={<Globe className="size-3.5" />}>
                  {prettyHost(user.website)}
                </ExternalLink>
              )}
              {user.github_username && (
                <ExternalLink
                  href={`https://github.com/${user.github_username}`}
                  icon={<GithubIcon className="size-3.5" />}
                >
                  {user.github_username}
                </ExternalLink>
              )}
              {user.twitter_username && (
                <ExternalLink
                  href={`https://x.com/${user.twitter_username}`}
                  icon={<XIcon className="size-3.5" />}
                >
                  {user.twitter_username}
                </ExternalLink>
              )}
            </div>
          </div>
        </motion.header>

        {/* Resumen: solo si el autor lo ha publicado. */}
        {user.stats && (
          <motion.div variants={fadeUpItem} className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<Layers className="size-4" />}
              label={t('publicProfile.stats.components')}
              value={user.stats.components}
            />
            <Stat
              icon={<Download className="size-4" />}
              label={t('publicProfile.stats.downloads')}
              value={user.stats.downloads}
            />
            <Stat
              icon={<Star className="size-4" />}
              label={t('publicProfile.stats.rating')}
              value={user.stats.rating_avg !== null ? user.stats.rating_avg.toFixed(1) : '—'}
              hint={
                user.stats.rating_count > 0
                  ? t('publicProfile.stats.ratingCount', { count: user.stats.rating_count })
                  : undefined
              }
            />
          </motion.div>
        )}

        <motion.section variants={fadeUpItem} className="mt-12">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {t('publicProfile.published')}
          </h2>

          {items.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-border bg-surface/50 px-6 py-12 text-center text-sm text-muted">
              {t('publicProfile.empty', { name: user.name })}
            </p>
          ) : (
            <div className="mt-6">
              <Masonry
                items={items}
                getKey={(component) => component.id}
                renderItem={(component) => <ComponentCard component={component} />}
              />
            </div>
          )}
        </motion.section>
      </motion.main>
    </AppShell>
  )
}

function Avatar({ user }: { user: User }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="size-20 shrink-0 rounded-full border border-border object-cover"
      />
    )
  }
  return (
    <span className="grid size-20 shrink-0 place-items-center rounded-full bg-navy-50 font-display text-2xl font-bold text-navy">
      {user.name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function ExternalLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      // noopener/noreferrer: son URLs que escribe el propio autor en su perfil.
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
    >
      {icon}
      {children}
    </a>
  )
}

/** Muestra solo el host de una URL, que es lo legible en un perfil. */
function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
