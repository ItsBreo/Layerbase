/**
 * Hooks de React Query del panel de admin (gestión de usuarios).
 *
 * Cada mutación invalida el árbol completo de `adminUserKeys`: cambiar un rol o
 * suspender una cuenta mueve también los contadores de la cabecera, así que no
 * basta con refrescar la página actual del listado.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserRole } from '@/auth/types'
import { getErrorMessage } from '@/lib/api'
import { useI18n } from '@/i18n/useI18n'
import {
  adminCatalogApi,
  adminMetricsApi,
  adminUsersApi,
  type CategoryPayload,
  type UserFilters,
} from '@/admin/api'

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  list: (filters: UserFilters) => ['admin', 'users', 'list', filters] as const,
  counts: () => ['admin', 'users', 'counts'] as const,
}

export function useAdminUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    queryFn: () => adminUsersApi.list(filters),
    // Al teclear en la búsqueda, mantiene la tabla en pantalla en vez de
    // parpadear a skeleton en cada pulsación.
    placeholderData: keepPreviousData,
  })
}

export function useAdminUserCounts() {
  return useQuery({
    queryKey: adminUserKeys.counts(),
    queryFn: () => adminUsersApi.counts(),
  })
}

/** Invalidación + toast compartidos por las tres mutaciones del panel. */
function useAdminUserMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  successKey: string,
) {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUserKeys.all })
      toast.success(t(successKey))
    },
    // Los 422 del backend (no puedes cambiarte el rol / suspenderte) llegan
    // aquí con su mensaje ya redactado.
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useUpdateUserRole() {
  return useAdminUserMutation(
    ({ id, role }: { id: number; role: UserRole }) => adminUsersApi.updateRole(id, role),
    'admin.users.toast.roleUpdated',
  )
}

export function useBanUser() {
  return useAdminUserMutation(
    ({ id, reason }: { id: number; reason: string }) => adminUsersApi.ban(id, reason),
    'admin.users.toast.banned',
  )
}

export function useUnbanUser() {
  return useAdminUserMutation(
    (id: number) => adminUsersApi.unban(id),
    'admin.users.toast.unbanned',
  )
}

export const adminMetricsKey = ['admin', 'metrics'] as const

/** Resumen de la plataforma. Sin refetch agresivo: no es un panel en vivo. */
export function useAdminMetrics() {
  return useQuery({
    queryKey: adminMetricsKey,
    queryFn: () => adminMetricsApi.get(),
    staleTime: 1000 * 60,
  })
}

// --- Catálogo ---------------------------------------------------------------

export const adminCatalogKeys = {
  all: ['admin', 'catalog'] as const,
  categories: () => ['admin', 'catalog', 'categories'] as const,
  tags: (orphan: boolean) => ['admin', 'catalog', 'tags', orphan] as const,
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminCatalogKeys.categories(),
    queryFn: () => adminCatalogApi.categories(),
  })
}

export function useAdminTags(orphan: boolean) {
  return useQuery({
    queryKey: adminCatalogKeys.tags(orphan),
    queryFn: () => adminCatalogApi.tags({ orphan: orphan || undefined }),
    placeholderData: keepPreviousData,
  })
}

/**
 * Invalidación + toast comunes a todo el catálogo.
 *
 * Se invalida el árbol entero y no solo la lista tocada: borrar una etiqueta
 * cambia también el listado de huérfanas, y tocar una categoría cambia los
 * contadores que se ven en el resto del panel.
 */
function useCatalogMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  successKey: string,
) {
  const qc = useQueryClient()
  const { t } = useI18n()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminCatalogKeys.all })
      toast.success(t(successKey))
    },
    // Los 422 del backend (categoría en uso, etiqueta en uso) llegan con su
    // mensaje ya redactado, incluido cuántos componentes lo impiden.
    onError: (e) => toast.error(getErrorMessage(e)),
  })
}

export function useCreateCategory() {
  return useCatalogMutation(
    (payload: CategoryPayload) => adminCatalogApi.createCategory(payload),
    'admin.catalog.toast.created',
  )
}

export function useUpdateCategory() {
  return useCatalogMutation(
    ({ slug, payload }: { slug: string; payload: Partial<CategoryPayload> }) =>
      adminCatalogApi.updateCategory(slug, payload),
    'admin.catalog.toast.updated',
  )
}

export function useDeleteCategory() {
  return useCatalogMutation(
    (slug: string) => adminCatalogApi.deleteCategory(slug),
    'admin.catalog.toast.deleted',
  )
}

export function useDeleteTag() {
  return useCatalogMutation(
    (slug: string) => adminCatalogApi.deleteTag(slug),
    'admin.catalog.toast.tagDeleted',
  )
}

export function usePurgeOrphanTags() {
  return useCatalogMutation(
    () => adminCatalogApi.purgeOrphanTags(),
    'admin.catalog.toast.purged',
  )
}
