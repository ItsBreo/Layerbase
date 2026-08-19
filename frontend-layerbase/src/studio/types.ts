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
  /** Portada ya resuelta por el backend (imagen del autor > thumbnail).
   *  Solo presente si el endpoint cargó los archivos. */
  preview_url?: string | null
  published_at: string | null
  /** Motivo del último rechazo. El backend solo lo envía al autor y a los
   *  admin, así que en la ficha pública llega `undefined`. */
  rejection_reason?: string | null
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

/** Valoración de un componente. */
export interface Review {
  id: number
  rating: number
  body: string
  created_at: string
  updated_at: string
  author?: User
  /** Marcado por el backend: evita comparar ids en el frontend. */
  is_mine: boolean
  /** Solo para admin. */
  reported?: boolean
  report_reason?: string | null
}

export interface ReviewPayload {
  rating: number
  body: string
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
  /**
   * Solo en el listado público y solo cuando se ha buscado algo.
   *
   * `fuzzy` es true cuando la búsqueda exacta no encontró nada y los resultados
   * vienen del plan B por parecido. Sin este dato, quien busca "carusel" recibe
   * componentes que no contienen lo que escribió y no puede distinguir una
   * corrección de un fallo del buscador.
   */
  search?: {
    term: string
    fuzzy: boolean
  }
}

/** Respuesta de descarga: URL firmada temporal. */
export interface DownloadResponse {
  url: string
  filename: string
  expires_in: number
}

export const STACKS: Stack[] = ['react', 'angular', 'vanilla']

/** Contadores por estado que alimentan las pestañas del panel de moderación. */
export type ModerationCounts = Record<ComponentStatus, number>

export const COMPONENT_STATUSES: ComponentStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'unpublished',
]
