/**
 * Servicio del panel de admin: gestión de usuarios.
 *
 * Todo cuelga de `/admin`, protegido en el backend por `role:admin`. La
 * moderación de componentes vive en `@/studio/api` porque pertenece al dominio
 * de componentes; aquí solo lo que es propio de administración.
 */
import { api } from '@/lib/api'
import type { User, UserRole } from '@/auth/types'
import type { ComponentStatus, Paginated } from '@/studio/types'

/** Filtros del listado de usuarios. */
export interface UserFilters {
  q?: string
  role?: UserRole
  /** `false` es un filtro legítimo (solo activos), no "sin filtro". */
  banned?: boolean
  page?: number
  per_page?: number
}

/** Contadores que alimentan la cabecera del panel de usuarios. */
export interface UserCounts {
  total: number
  banned: number
  roles: Record<UserRole, number>
}

export const adminUsersApi = {
  async list(filters: UserFilters = {}): Promise<Paginated<User>> {
    const { data } = await api.get<Paginated<User>>('/admin/users', { params: filters })
    return data
  },

  async counts(): Promise<UserCounts> {
    const { data } = await api.get<{ data: UserCounts }>('/admin/users/counts')
    return data.data
  },

  /** Cambia el rol global. El backend rechaza cambiarse el propio (422). */
  async updateRole(id: number, role: UserRole): Promise<User> {
    const { data } = await api.patch<{ message: string; data: User }>(`/admin/users/${id}/role`, {
      role,
    })
    return data.data
  },

  /** Suspende la cuenta y revoca sus tokens. Motivo obligatorio. */
  async ban(id: number, reason: string): Promise<User> {
    const { data } = await api.post<{ message: string; data: User }>(`/admin/users/${id}/ban`, {
      reason,
    })
    return data.data
  },

  async unban(id: number): Promise<User> {
    const { data } = await api.post<{ message: string; data: User }>(`/admin/users/${id}/unban`)
    return data.data
  },
}

/** Resumen de la plataforma (solo lectura, solo admin). */
export interface PlatformMetrics {
  window_days: number
  users: {
    total: number
    banned: number
    unverified: number
    recent: number
    roles: Record<UserRole, number>
  }
  components: {
    total: number
    downloads: number
    published_recent: number
    statuses: Record<ComponentStatus, number>
  }
  activity: {
    views_total: number
    views_recent: number
    /** Solo los días CON visitas; los huecos los rellena el frontend. */
    daily_views: Record<string, number>
  }
  top_components: Array<{
    slug: string
    title: string
    author: string | null
    views: number
    downloads: number
  }>
  top_authors: Array<{ id: number; name: string; components: number }>
}

export const adminMetricsApi = {
  async get(): Promise<PlatformMetrics> {
    const { data } = await api.get<{ data: PlatformMetrics }>('/admin/metrics')
    return data.data
  },
}
