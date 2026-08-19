/** Hooks de React Query de las notificaciones. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/notifications/api'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
  unread: () => ['notifications', 'unread'] as const,
}

/**
 * Contador de no leídas.
 *
 * Se refresca cada minuto: son avisos de moderación, no un chat, y no compensa
 * castigar al servidor con sondeos cortos. `enabled` lo decide quien llama —
 * sin sesión no hay nada que contar.
 */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

/** Listado. Solo se pide al abrir la campana, no de fondo. */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationsApi.list(),
    enabled,
  })
}

function useNotificationMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    // Se invalida el árbol entero: marcar una como leída cambia la lista y el
    // contador a la vez.
    onSuccess: () => void qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkRead() {
  return useNotificationMutation((id: string) => notificationsApi.markRead(id))
}

export function useMarkAllRead() {
  return useNotificationMutation(() => notificationsApi.markAllRead())
}
