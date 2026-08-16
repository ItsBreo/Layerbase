/**
 * Servicio del panel de admin: gestión de usuarios.
 *
 * Todo cuelga de `/admin`, protegido en el backend por `role:admin`. La
 * moderación de componentes vive en `@/studio/api` porque pertenece al dominio
 * de componentes; aquí solo lo que es propio de administración.
 */
import { api } from '@/lib/api'
import type { User, UserRole } from '@/auth/types'
import type { Paginated } from '@/studio/types'

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
