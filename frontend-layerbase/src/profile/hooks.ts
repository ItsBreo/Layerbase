/** Hooks de React Query del perfil público. */
import { useQuery } from '@tanstack/react-query'
import { publicProfileApi } from '@/profile/api'

export const publicProfileKeys = {
  all: ['public-profile'] as const,
  detail: (id: string | number) => ['public-profile', 'detail', String(id)] as const,
  components: (id: string | number) => ['public-profile', 'components', String(id)] as const,
}

export function usePublicProfile(id: string | number | undefined) {
  return useQuery({
    queryKey: publicProfileKeys.detail(id ?? ''),
    queryFn: () => publicProfileApi.get(id as string),
    enabled: id != null && id !== '',
    // Un 404 (cuenta inexistente o suspendida) no cambia al reintentar.
    retry: false,
  })
}

export function usePublicProfileComponents(id: string | number | undefined) {
  return useQuery({
    queryKey: publicProfileKeys.components(id ?? ''),
    queryFn: () => publicProfileApi.components(id as string),
    enabled: id != null && id !== '',
    retry: false,
  })
}
