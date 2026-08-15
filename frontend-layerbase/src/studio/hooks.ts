/**
 * Hooks de React Query para el dominio de componentes.
 *
 * Centralizan claves de caché, invalidaciones y feedback (toasts). Las páginas
 * consumen estos hooks en vez de llamar a `componentsApi` directamente, para
 * que la lógica de caché viva en un solo sitio.
 */
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import { useI18n } from '@/i18n/useI18n'
import { catalogApi, componentsApi, moderationApi, type ComponentFilters } from '@/studio/api'
import { unzipFirstTextFile } from '@/studio/zip'
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
  previewCode: (idOrSlug: string | number) => ['components', 'preview-code', idOrSlug] as const,
  categories: (stack?: Stack) => ['categories', stack ?? 'all'] as const,
  tags: (q?: string) => ['tags', q ?? ''] as const,
}

/** Claves del panel de moderación. Separadas de `componentKeys` porque la cola
 *  se invalida por acciones de admin, no por las del autor. */
export const moderationKeys = {
  all: ['moderation'] as const,
  queue: (status: ComponentStatus) => ['moderation', 'queue', status] as const,
  counts: () => ['moderation', 'counts'] as const,
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
    // Al cambiar de filtro mantiene los resultados previos en pantalla mientras
    // llega la nueva página, evitando el parpadeo a skeleton.
    placeholderData: keepPreviousData,
  })
}

export function useMyComponents(status?: ComponentStatus) {
  return useQuery({
    queryKey: componentKeys.mine(status),
    queryFn: () => componentsApi.mine({ status }),
    placeholderData: keepPreviousData,
  })
}

export function useComponent(idOrSlug: string | number | undefined) {
  return useQuery({
    queryKey: componentKeys.detail(idOrSlug ?? ''),
    queryFn: () => componentsApi.get(idOrSlug as string | number),
    enabled: idOrSlug != null && idOrSlug !== '',
  })
}

/**
 * Código listo para el sandbox: pide la URL firmada, descarga el ZIP y extrae
 * el texto. Lo comparten la vista previa del autor y la ficha pública, así que
 * el resultado se cachea por slug.
 *
 * `enabled` lo decide quien llama (React sigue exigiendo que el hook se invoque
 * siempre): en la ficha solo tiene sentido si el componente es React, tiene
 * código y el espectador puede acceder a él.
 */
export function usePreviewCode(idOrSlug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: componentKeys.previewCode(idOrSlug ?? ''),
    queryFn: async () => {
      const { url } = await componentsApi.previewCode(idOrSlug as string)
      const res = await fetch(url)
      if (!res.ok) throw new Error('No se pudo descargar el código del componente.')
      return unzipFirstTextFile(await res.arrayBuffer())
    },
    // Un 403 (componente de pago) no se reintenta: la respuesta no va a cambiar.
    retry: false,
    // La URL firmada caduca en 5 min, pero el código ya extraído no: se cachea.
    staleTime: 1000 * 60 * 10,
    enabled: enabled && idOrSlug != null && idOrSlug !== '',
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

/**
 * Vuelve a borrador tras un rechazo o una despublicación. Sin este paso un
 * componente rechazado no puede reenviarse: el backend no acepta `submit`
 * desde `rejected`.
 */
export function useRevertComponent() {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn: (idOrSlug: string | number) => componentsApi.revert(idOrSlug),
    onSuccess: (updated: Component) => {
      qc.setQueryData(componentKeys.detail(updated.slug), updated)
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t('studio.toast.reverted'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

// --- Moderación (admin) -----------------------------------------------------

export function useModerationQueue(status: ComponentStatus = 'pending_review') {
  return useQuery({
    queryKey: moderationKeys.queue(status),
    queryFn: () => moderationApi.queue({ status }),
    placeholderData: keepPreviousData,
  })
}

export function useModerationCounts() {
  return useQuery({
    queryKey: moderationKeys.counts(),
    queryFn: () => moderationApi.counts(),
  })
}

/**
 * Tras resolver una revisión se invalidan DOS árboles: la cola de moderación
 * (la fila desaparece de `pending_review`) y el de componentes (el marketplace
 * público acaba de ganar o perder una ficha).
 */
function useResolveModeration<TVars>(
  mutationFn: (vars: TVars) => Promise<Component>,
  successKey: string,
) {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: moderationKeys.all })
      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(t(successKey))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useApproveComponent() {
  return useResolveModeration(
    (idOrSlug: string | number) => moderationApi.approve(idOrSlug),
    'admin.toast.approved',
  )
}

export function useRejectComponent() {
  return useResolveModeration(
    ({ idOrSlug, reason }: { idOrSlug: string | number; reason: string }) =>
      moderationApi.reject(idOrSlug, reason),
    'admin.toast.rejected',
  )
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
