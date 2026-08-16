/**
 * Panel de admin — gestión de usuarios: roles y suspensiones.
 *
 * La columna `banned` y el middleware que la aplica ya existían, pero nada
 * podía escribirlas: hasta ahora suspender una cuenta solo era posible por SQL.
 *
 * Regla que se refleja en la interfaz: **un admin no puede actuar sobre sí
 * mismo**. Es lo que garantiza que siempre queda un admin activo, así que en la
 * fila propia no se ofrecen ni el selector de rol ni el botón de suspender (el
 * backend lo rechaza igualmente con un 422).
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Ban, RotateCcw, Search, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tag } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Field'
import { useAuth } from '@/auth/AuthContext'
import type { User, UserRole } from '@/auth/types'
import { useI18n } from '@/i18n/useI18n'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AdminNav } from '@/admin/AdminNav'
import { BanDialog } from '@/admin/BanDialog'
import { useAdminUserCounts, useAdminUsers, useUnbanUser, useUpdateUserRole } from '@/admin/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const ROLES: UserRole[] = ['user', 'author', 'admin']

/** Filtro de estado. 'all' se traduce a "sin parámetro `banned`". */
type StatusFilter = 'all' | 'active' | 'banned'

export default function AdminUsers() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [status, setStatus] = useState<StatusFilter>('all')

  // Sin debounce se lanzaría una petición por tecla pulsada.
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isPlaceholderData } = useAdminUsers({
    q: debouncedSearch || undefined,
    role: role || undefined,
    banned: status === 'all' ? undefined : status === 'banned',
  })
  const { data: counts } = useAdminUserCounts()

  const users = data?.data ?? []

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/60 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-accent backdrop-blur">
            <ShieldCheck className="size-3.5" />
            {t('admin.badge')}
          </div>
          <AccentedTitle text={t('admin.users.title')} className="mt-4 text-4xl" />
          <p className="mt-3 max-w-xl text-muted">{t('admin.users.body')}</p>
        </motion.div>

        <AdminNav />

        {/* Resumen */}
        {counts && (
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label={t('admin.users.stats.total')} value={counts.total} />
            <StatCard label={t('dashboard.roles.author')} value={counts.roles.author} />
            <StatCard label={t('dashboard.roles.admin')} value={counts.roles.admin} />
            <StatCard
              label={t('admin.users.stats.banned')}
              value={counts.banned}
              tone={counts.banned > 0 ? 'danger' : undefined}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              name="q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.users.searchPlaceholder')}
              className="pl-9"
            />
          </div>
          <Select name="role" value={role} onChange={(e) => setRole(e.target.value as UserRole | '')}>
            <option value="">{t('admin.users.filters.allRoles')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`dashboard.roles.${r}`)}
              </option>
            ))}
          </Select>
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">{t('admin.users.filters.allStatuses')}</option>
            <option value="active">{t('admin.users.filters.active')}</option>
            <option value="banned">{t('admin.users.filters.banned')}</option>
          </Select>
        </div>

        <div className={cn('mt-6 space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
          {isLoading ? (
            <UsersSkeleton />
          ) : users.length === 0 ? (
            <EmptyUsers />
          ) : (
            users.map((user) => <UserRow key={user.id} user={user} />)
          )}
        </div>
      </main>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'danger'
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', tone === 'danger' && 'text-danger')}>
        {value}
      </p>
    </div>
  )
}

function UserRow({ user }: { user: User }) {
  const { t, lang } = useI18n()
  const { user: current } = useAuth()
  const updateRole = useUpdateUserRole()
  const unban = useUnbanUser()
  const [banning, setBanning] = useState(false)

  // La fila propia se muestra pero no se puede accionar: es la invariante que
  // impide quedarse sin ningún admin activo.
  const isSelf = current?.id === user.id

  return (
    <div
      className={cn(
        'rounded-lg border bg-surface p-4 transition-colors',
        user.banned ? 'border-danger/30 bg-danger/5' : 'border-border hover:border-navy-200',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Los nombres de usuario van SIEMPRE en Syne (identidad de marca). */}
              <span className="truncate font-display font-semibold text-text">{user.name}</span>
              {isSelf && <Tag>{t('admin.users.you')}</Tag>}
              {user.banned && (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger/10 px-2.5 py-0.5 font-mono text-xs font-medium text-danger">
                  <span className="size-1.5 rounded-full bg-current" />
                  {t('admin.users.bannedBadge')}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
              <span>{t('admin.users.joined', { date: timeAgo(user.created_at, lang) })}</span>
              {user.components_count !== undefined && (
                <span>{t('admin.users.components', { count: user.components_count })}</span>
              )}
              {!user.email_verified_at && <span>{t('admin.users.unverified')}</span>}
            </div>
            {user.banned && user.ban_reason && (
              <p className="mt-2 text-sm text-muted">
                <span className="font-semibold text-text">{t('admin.users.banReason')}:</span>{' '}
                {user.ban_reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select
            name={`role-${user.id}`}
            value={user.role}
            disabled={isSelf || updateRole.isPending}
            onChange={(e) =>
              updateRole.mutate({ id: user.id, role: e.target.value as UserRole })
            }
            className="h-9 w-32 text-xs"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`dashboard.roles.${r}`)}
              </option>
            ))}
          </Select>

          {!isSelf &&
            (user.banned ? (
              <Button
                variant="secondary"
                size="sm"
                loading={unban.isPending}
                onClick={() => unban.mutate(user.id)}
                icon={<RotateCcw className="size-3.5" />}
              >
                {t('admin.users.actions.unban')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBanning(true)}
                icon={<Ban className="size-3.5 text-danger" />}
              >
                {t('admin.users.actions.ban')}
              </Button>
            ))}
        </div>
      </div>

      <BanDialog open={banning} onOpenChange={setBanning} user={user} />
    </div>
  )
}

/** Avatar con iniciales de reserva cuando la cuenta no tiene imagen. */
function Avatar({ user }: { user: User }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="size-10 shrink-0 rounded-full border border-border object-cover"
      />
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-50 font-display text-sm font-semibold text-navy">
      {user.name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function EmptyUsers() {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
      <UsersIcon className="mx-auto size-8 text-muted" />
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted">{t('admin.users.empty')}</p>
    </div>
  )
}

function UsersSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </>
  )
}
