/**
 * Capa de datos del marketplace para la Home.
 *
 * AHORA: datos MOCK (no hay backend de componentes todavía — llega en S2/S3).
 * DESPUÉS: sustituir el cuerpo de `fetchLatestComponents` / `fetchPlatformStats`
 * por llamadas reales con el cliente axios; los componentes de UI y los hooks
 * NO cambian (consumen React Query igual).
 *
 *   // const { data } = await api.get('/components', { params: { sort: 'latest', limit } })
 *   // return data
 */
import { useQuery } from '@tanstack/react-query'
import type { ComponentSummary, PlatformStats } from '@/features/marketplace/types'

// --- MOCK DATA (borrar cuando el backend esté listo) -----------------------

const MOCK_COMPONENTS: ComponentSummary[] = [
  { id: 1, title: 'Pricing Table', slug: 'pricing-table', stack: 'react', price: 0, thumbnailUrl: null, ratingAvg: 4.9, downloads: 3120, author: { name: 'Ada Lovelace', avatarUrl: null } },
  { id: 2, title: 'Auth Modal', slug: 'auth-modal', stack: 'react', price: 12, thumbnailUrl: null, ratingAvg: 4.7, downloads: 1840, author: { name: 'Linus Torvalds', avatarUrl: null } },
  { id: 3, title: 'Dashboard Sidebar', slug: 'dashboard-sidebar', stack: 'vanilla', price: 0, thumbnailUrl: null, ratingAvg: 4.8, downloads: 2675, author: { name: 'Grace Hopper', avatarUrl: null } },
  { id: 4, title: 'Command Palette', slug: 'command-palette', stack: 'react', price: 19, thumbnailUrl: null, ratingAvg: 5.0, downloads: 980, author: { name: 'Margaret Hamilton', avatarUrl: null } },
  { id: 5, title: 'Data Table', slug: 'data-table', stack: 'angular', price: 24, thumbnailUrl: null, ratingAvg: 4.6, downloads: 1410, author: { name: 'Dennis Ritchie', avatarUrl: null } },
  { id: 6, title: 'Toast Stack', slug: 'toast-stack', stack: 'vanilla', price: 0, thumbnailUrl: null, ratingAvg: 4.5, downloads: 2230, author: { name: 'Barbara Liskov', avatarUrl: null } },
  { id: 7, title: 'Kanban Board', slug: 'kanban-board', stack: 'react', price: 15, thumbnailUrl: null, ratingAvg: 4.8, downloads: 1670, author: { name: 'Alan Kay', avatarUrl: null } },
  { id: 8, title: 'Hero Section', slug: 'hero-section', stack: 'angular', price: 0, thumbnailUrl: null, ratingAvg: 4.7, downloads: 3540, author: { name: 'Donald Knuth', avatarUrl: null } },
]

const MOCK_STATS: PlatformStats = {
  componentsPublished: 128,
  activeAuthors: 37,
  totalDownloads: 24800,
  pageViews: 153000,
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// --- Fetchers (único punto a tocar cuando exista el backend) ---------------

async function fetchLatestComponents(limit: number): Promise<ComponentSummary[]> {
  await delay(500)
  return MOCK_COMPONENTS.slice(0, limit)
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  await delay(400)
  return MOCK_STATS
}

// Componentes subidos por el usuario autenticado. MOCK: devuelve un subconjunto
// atribuido al propio usuario. DESPUÉS:
//   // const { data } = await api.get('/components', { params: { author: 'me' } })
//   // return data
async function fetchMyComponents(authorName: string): Promise<ComponentSummary[]> {
  await delay(500)
  // Subconjunto con variedad de stacks (React, Vanilla y Angular).
  const mineIds = [1, 4, 6, 5, 8]
  return MOCK_COMPONENTS.filter((component) => mineIds.includes(component.id)).map((component) => ({
    ...component,
    author: { name: authorName, avatarUrl: null },
  }))
}

// --- Hooks (lo que consume la UI) ------------------------------------------

export function useLatestComponents(limit = 8) {
  return useQuery({
    queryKey: ['components', 'latest', limit],
    queryFn: () => fetchLatestComponents(limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['stats', 'platform'],
    queryFn: fetchPlatformStats,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyComponents(authorName: string) {
  return useQuery({
    queryKey: ['components', 'mine', authorName],
    queryFn: () => fetchMyComponents(authorName),
    staleTime: 5 * 60 * 1000,
  })
}
