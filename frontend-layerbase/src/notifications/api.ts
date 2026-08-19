/**
 * Notificaciones in-app del usuario autenticado.
 *
 * No hay id de usuario en ninguna ruta: el backend opera siempre sobre la
 * sesión, así que desde aquí no se pueden pedir las de otra persona.
 */
import { api } from '@/lib/api'

/** Tipos que sabe pintar la campana. Coinciden con el `type` del payload. */
export type NotificationType =
  | 'component_approved'
  | 'component_rejected'
  | 'component_submitted'
  | 'review_received'

/**
 * El payload varía por tipo (un rechazo lleva `reason`; una reseña, `rating`),
 * así que los campos propios de cada uno son opcionales.
 */
export interface AppNotification {
  id: string
  type: NotificationType
  read_at: string | null
  created_at: string
  component_slug: string
  component_title: string
  reason?: string
  rating?: number
  reviewer_name?: string
  author_name?: string
}

export interface NotificationPage {
  data: AppNotification[]
  meta: { current_page: number; last_page: number; total: number; unread: number }
}

export const notificationsApi = {
  async list(): Promise<NotificationPage> {
    const { data } = await api.get<NotificationPage>('/notifications')
    return data
  },

  /** Solo el contador: la campana lo consulta a menudo y no necesita la lista. */
  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ unread: number }>('/notifications/unread-count')
    return data.unread
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all')
  },
}
