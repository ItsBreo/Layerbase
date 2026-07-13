/**
 * Tipos del dominio de componentes (Módulo 3).
 *
 * Reflejan exactamente lo que devuelve `ComponentResource` del backend
 * (allow-list). Nota: el backend castea `price`/`rating_avg` como DECIMAL, así
 * que llegan como STRING ("9.99"), no como number.
 */
import type { User } from '@/auth/types'

export type Stack = 'react' | 'angular' | 'vanilla'

export type ComponentStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'unpublished'

export type ComponentFileType = 'source' | 'readme' | 'preview'

/** Categoría de clasificación. `stack` puede ser transversal ('all'). */
export interface Category {
  id: number
  name: string
  slug: string
  stack: Stack | 'all'
  description: string | null
  components_count: number
}

export interface Tag {
  id: number
  name: string
  slug: string
}

/** Metadatos de un archivo. El `source` nunca trae `url` (descarga aparte). */
export interface ComponentFile {
  type: ComponentFileType
  filename: string
  mime_type: string
  size_bytes: number
  url?: string
}

export interface Component {
  id: number
  title: string
  slug: string
  description: string
  stack: Stack
  /** DECIMAL serializado como string, p. ej. "9.99". */
  price: string
  is_free: boolean
  status: ComponentStatus
  downloads: number
  rating_avg: string | null
  rating_count: number
  thumbnail_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string

  // Relaciones (presentes según el endpoint las cargue).
  author?: User
  category?: Category
  tags?: Tag[]
  files?: ComponentFile[]
  has_source?: boolean
  can_download_source: boolean
}

/** Payload de creación (POST /components). */
export interface CreateComponentPayload {
  title: string
  description: string
  category_id: number
  stack: Stack
  price: number
  tags?: string[]
}

/** Payload de edición parcial (PATCH /components/:id). */
export type UpdateComponentPayload = Partial<CreateComponentPayload>

/** Respuesta paginada estándar de Laravel. */
export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    from: number | null
    to: number | null
    last_page: number
    per_page: number
    total: number
  }
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
}

/** Respuesta de descarga: URL firmada temporal. */
export interface DownloadResponse {
  url: string
  filename: string
  expires_in: number
}

export const STACKS: Stack[] = ['react', 'angular', 'vanilla']

export const COMPONENT_STATUSES: ComponentStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'unpublished',
]
