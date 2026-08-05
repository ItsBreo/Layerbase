/**
 * Servicio del dominio de componentes: única capa que conoce los endpoints
 * REST de `/api/components`, `/api/categories` y `/api/tags`. Los hooks y
 * componentes consumen estas funciones, no axios directamente.
 *
 * Contrato con el backend (Módulo 3):
 *  - Listas → paginador Laravel `{ data, meta, links }`.
 *  - Recurso único → envuelto en `{ data }` (se desenvuelve aquí con `unwrap`).
 *  - Endpoints de acción (submit/unpublish) → `{ message, data }`.
 */
import { api } from '@/lib/api'
import type {
  Category,
  Component,
  ComponentFileType,
  ComponentStatus,
  CreateComponentPayload,
  DownloadResponse,
  Paginated,
  Stack,
  Tag,
  UpdateComponentPayload,
} from '@/studio/types'

/** Desenvuelve `{ data: T }` de una respuesta de recurso único (tolera ambos). */
function unwrap<T>(payload: { data: T } | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/** Filtros del listado público de componentes. */
export interface ComponentFilters {
  stack?: Stack
  category?: string
  tag?: string
  q?: string
  free?: boolean
  paid?: boolean
  min_price?: number
  max_price?: number
  sort?: 'oldest' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'downloads'
  per_page?: number
  page?: number
}

export const componentsApi = {
  /** Listado público (solo publicados) con filtros. */
  async list(filters: ComponentFilters = {}): Promise<Paginated<Component>> {
    const { data } = await api.get<Paginated<Component>>('/components', { params: filters })
    return data
  },

  /** Componentes del autor autenticado (todos los estados). */
  async mine(params: { status?: ComponentStatus; page?: number; per_page?: number } = {}): Promise<
    Paginated<Component>
  > {
    const { data } = await api.get<Paginated<Component>>('/components/my', { params })
    return data
  },

  /** Detalle por slug (o id). */
  async get(idOrSlug: string | number): Promise<Component> {
    const { data } = await api.get<{ data: Component }>(`/components/${idOrSlug}`)
    return unwrap(data)
  },

  /** Crea un borrador. */
  async create(payload: CreateComponentPayload): Promise<Component> {
    const { data } = await api.post<{ data: Component }>('/components', payload)
    return unwrap(data)
  },

  /** Edición parcial. */
  async update(idOrSlug: string | number, payload: UpdateComponentPayload): Promise<Component> {
    const { data } = await api.patch<{ data: Component }>(`/components/${idOrSlug}`, payload)
    return unwrap(data)
  },

  /** Borra (o despublica si tiene compras) un componente. */
  async remove(idOrSlug: string | number): Promise<void> {
    await api.delete(`/components/${idOrSlug}`)
  },

  /** Envía a revisión (draft → pending_review). */
  async submit(idOrSlug: string | number): Promise<Component> {
    const { data } = await api.post<{ message: string; data: Component }>(
      `/components/${idOrSlug}/submit`,
    )
    return data.data
  },

  /** Despublica (published → unpublished). */
  async unpublish(idOrSlug: string | number): Promise<Component> {
    const { data } = await api.post<{ message: string; data: Component }>(
      `/components/${idOrSlug}/unpublish`,
    )
    return data.data
  },

  /** Sube (o reemplaza) un archivo. Multipart; el interceptor de axios respeta
   *  el Content-Type de FormData. */
  async uploadFile(
    idOrSlug: string | number,
    file: File,
    type: ComponentFileType,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    await api.post(`/components/${idOrSlug}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  },

  /** Obtiene una URL firmada temporal para descargar el código fuente. */
  async download(idOrSlug: string | number): Promise<DownloadResponse> {
    const { data } = await api.get<DownloadResponse>(`/components/${idOrSlug}/download`)
    return data
  },
}

export const catalogApi = {
  /** Categorías (opcionalmente filtradas por stack; incluye transversales). */
  async categories(stack?: Stack): Promise<Category[]> {
    const { data } = await api.get<{ data: Category[] } | Category[]>('/categories', {
      params: stack ? { stack } : undefined,
    })
    return Array.isArray(data) ? data : data.data
  },

  /** Autocompletado de tags por nombre. */
  async tags(q?: string): Promise<Tag[]> {
    const { data } = await api.get<{ data: Tag[] } | Tag[]>('/tags', {
      params: q ? { q } : undefined,
    })
    return Array.isArray(data) ? data : data.data
  },
}
