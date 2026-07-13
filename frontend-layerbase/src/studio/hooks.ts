/**
 * Hooks de React Query para el dominio de componentes.
 *
 * Centralizan claves de caché, invalidaciones y feedback (toasts). Las páginas
 * consumen estos hooks en vez de llamar a `componentsApi` directamente, para
 * que la lógica de caché viva en un solo sitio.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import { useI18n } from '@/i18n/useI18n'
import { catalogApi, componentsApi, type ComponentFilters } from '@/studio/api'
import type {
  Component,
  ComponentFileType,
  ComponentStatus,
  CreateComponentPayload,
  Stack,
  UpdateComponentPayload,
} from '@/studio/types'

/** Claves de caché centralizadas (evita strings sueltos y typos). */
export const componentKeys = {
  all: ['components'] as const,
  explore: (filters: ComponentFilters) => ['components', 'explore', filters] as const,
  mine: (status?: ComponentStatus) => ['components', 'mine', status ?? 'all'] as const,
  detail: (idOrSlug: string | number) => ['components', 'detail', idOrSlug] as const,
  categories: (stack?: Stack) => ['categories', stack ?? 'all'] as const,
  tags: (q?: string) => ['tags', q ?? ''] as const,
}

// --- Queries ----------------------------------------------------------------

/**
 * Listado público paginado con scroll infinito (vista principal tipo Pinterest).
 * La página siguiente se deriva de `meta.current_page < meta.last_page`.
 */
export function useExploreComponents(filters: ComponentFilters = {}) {
  return useInfiniteQuery({
    queryKey: componentKeys.explore(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => componentsApi.list({ ...filters, page: pageParam }),
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  })
}

export function useMyComponents(status?: ComponentStatus) {
  return useQuery({
    queryKey: componentKeys.mine(status),
    queryFn: () => componentsApi.mine({ status }),
  })
}

export function useComponent(idOrSlug: string | number | undefined) {
  return useQuery({
    queryKey: componentKeys.detail(idOrSlug ?? ''),
    queryFn: () => componentsApi.get(idOrSlug as string | number),
    enabled: idOrSlug != null && idOrSlug !== '',
  })
}

export function useCategories(stack?: Stack) {
  return useQuery({
    queryKey: componentKeys.categories(stack),
    queryFn: () => catalogApi.categories(stack),
    staleTime: 1000 * 60 * 10, // El catálogo cambia poco.
  })
}

// --- Mutaciones -------------------------------------------------------------

export function useCreateComponent() {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (payload: CreateComponentPayload) => componentsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t('studio.toast.created'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useUpdateComponent(idOrSlug: string | number) {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (payload: UpdateComponentPayload) => componentsApi.update(idOrSlug, payload),
    onSuccess: (updated: Component) => {
      qc.setQueryData(componentKeys.detail(idOrSlug), updated)
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t('studio.toast.saved'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useDeleteComponent() {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (idOrSlug: string | number) => componentsApi.remove(idOrSlug),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t('studio.toast.deleted'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useSubmitComponent() {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (idOrSlug: string | number) => componentsApi.submit(idOrSlug),
    onSuccess: (updated: Component) => {
      qc.setQueryData(componentKeys.detail(updated.slug), updated)
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t('studio.toast.submitted'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useUnpublishComponent() {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (idOrSlug: string | number) => componentsApi.unpublish(idOrSlug),
    onSuccess: (updated: Component) => {
      qc.setQueryData(componentKeys.detail(updated.slug), updated)
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t('studio.toast.unpublished'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useUploadFile(idOrSlug: string | number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      type,
      onProgress,
    }: {
      file: File
      type: ComponentFileType
      onProgress?: (p: number) => void
    }) => componentsApi.uploadFile(idOrSlug, file, type, onProgress),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: componentKeys.detail(idOrSlug) })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}
