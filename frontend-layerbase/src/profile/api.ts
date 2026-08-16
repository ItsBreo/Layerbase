/**
 * Perfil público de un autor.
 *
 * Separado de `@/Login/auth` (que es la sesión propia) y de `@/studio/api` (el
 * dominio de componentes): aquí se consulta a OTRA persona, con auth opcional.
 */
import { api } from '@/lib/api'
import type { User } from '@/auth/types'
import type { Component, Paginated } from '@/studio/types'

export const publicProfileApi = {
  /**
   * Ficha del autor. `stats` solo viene si el autor publicó su resumen (o si
   * quien mira es él mismo o un admin), así que puede llegar `undefined`.
   */
  async get(id: number | string): Promise<User> {
    const { data } = await api.get<User>(`/users/${id}`)
    return data
  },

  /** Sus componentes publicados. Nunca incluye borradores, ni para el dueño. */
  async components(
    id: number | string,
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<Component>> {
    const { data } = await api.get<Paginated<Component>>(`/users/${id}/components`, { params })
    return data
  },
}
