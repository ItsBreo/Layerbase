/**
 * Tipos del marketplace usados por la Home (y reutilizables después).
 * Alineados con el modelo de datos (`components`, `users`).
 */

export type ComponentStack = 'react' | 'angular' | 'vanilla'

export interface ComponentAuthor {
  name: string
  avatarUrl: string | null
}

export interface ComponentSummary {
  id: number
  title: string
  slug: string
  stack: ComponentStack
  /** 0 = gratis / donativo. */
  price: number
  /** Preview real cuando exista; si es null, la card dibuja un wireframe. */
  thumbnailUrl: string | null
  ratingAvg: number
  downloads: number
  author: ComponentAuthor
}

export interface PlatformStats {
  componentsPublished: number
  activeAuthors: number
  totalDownloads: number
  pageViews: number
}
