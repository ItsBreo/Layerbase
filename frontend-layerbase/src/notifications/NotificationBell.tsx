/**
 * Campana de notificaciones de la barra superior.
 *
 * Cierra el agujero que dejaba la moderación: hasta ahora un autor enviaba un
 * componente a revisión y **no se enteraba** de si se lo habían aprobado o
 * rechazado salvo que volviera a mirar la ficha por su cuenta.
 *
 * La lista solo se pide al ABRIR el menú; de fondo únicamente viaja el
 * contador, que es mucho más barato.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { Bell, CircleCheck, CircleX, Inbox, Star, Upload } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/notifications/hooks'
import type { AppNotification, NotificationType } from '@/notifications/api'

/** Icono y color por tipo: el estado se lee de un vistazo, sin leer el texto. */
const ICONS: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  component_approved: { icon: CircleCheck, tone: 'text-success' },
  component_rejected: { icon: CircleX, tone: 'text-danger' },
  component_submitted: { icon: Upload, tone: 'text-accent' },
  review_received: { icon: Star, tone: 'text-warning' },
}

export function NotificationBell() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const { data: unread = 0 } = useUnreadCount(true)
  const { data, isLoading } = useNotifications(open)
  const markAllRead = useMarkAllRead()

  const notifications = data?.data ?? []

  return (
    <Dropdown.Root open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          // h-9 como el resto de controles de la barra superior.
          className="relative grid size-9 place-items-center rounded-md border border-border bg-surface/60 text-muted transition-colors hover:border-accent/40 hover:text-text"
          aria-label={t('notifications.title')}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-pill bg-accent px-1 font-mono text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-elevated"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {t('notifications.title')}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate(undefined)}
                className="text-xs text-accent transition hover:underline"
              >
                {t('notifications.markAll')}
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {t('notifications.loading')}
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="mx-auto size-6 text-muted" />
                <p className="mt-3 text-sm text-muted">{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: AppNotification
  onNavigate: () => void
}) {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const markRead = useMarkRead()

  const { icon: Icon, tone } = ICONS[notification.type]
  const isUnread = notification.read_at === null

  /**
   * Al pulsar se marca como leída y se va al componente. Un aviso que llevas
   * al sitio del que habla y sigue marcado como nuevo no sirve de nada.
   *
   * Los avisos de moderación llevan al studio (donde el autor puede actuar);
   * los de reseña, a la ficha pública (donde está la reseña).
   */
  const open = () => {
    if (isUnread) markRead.mutate(notification.id)
    onNavigate()
    navigate(
      notification.type === 'review_received'
        ? `/components/${notification.component_slug}`
        : `/studio/${notification.component_slug}`,
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-navy-50',
        isUnread && 'bg-accent/[0.04]',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone)} />

      <span className="min-w-0 flex-1">
        <span className="block text-sm text-text">
          {t(`notifications.types.${notification.type}`, {
            title: notification.component_title,
            name: notification.reviewer_name ?? notification.author_name ?? '',
            rating: notification.rating ?? 0,
          })}
        </span>

        {/* El motivo del rechazo viaja dentro del aviso: es justo lo que el
            autor necesita, y así no tiene que abrir la ficha para leerlo. */}
        {notification.reason && (
          <span className="mt-1 block line-clamp-2 text-xs text-muted">{notification.reason}</span>
        )}

        <span className="mt-1 block font-mono text-xs text-muted">
          {timeAgo(notification.created_at, lang)}
        </span>
      </span>

      {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
    </button>
  )
}
