/**
 * Vista principal pública del marketplace — rejilla tipo Pinterest (masonry).
 *
 * - Orden por defecto: lo más reciente primero, con un selector para cambiarlo.
 * - Scroll infinito con IntersectionObserver sobre un centinela al final.
 * - Filtros ligeros: stack, búsqueda de texto (con debounce) y orden.
 * - Entrada animada: cabecera y filtros en cascada al montar; las tarjetas, con
 *   `whileInView` para que las páginas siguientes también entren animadas.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Info, Loader2, Search } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Select } from '@/components/ui/Field'
import { Masonry } from '@/components/ui/Masonry'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useI18n } from '@/i18n/useI18n'
import { fadeUpItem, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { ComponentCard } from '@/studio/ComponentCard'
import { useExploreComponents } from '@/studio/hooks'
import type { ComponentFilters } from '@/studio/api'
import { STACKS, type Stack } from '@/studio/types'

type SortOption = NonNullable<ComponentFilters['sort']>
const SORT_OPTIONS: SortOption[] = [
  'newest',
  'oldest',
  'downloads',
  'rating',
  'price_asc',
  'price_desc',
]

/** Nº de tarjetas que entran en cascada al cargar; el resto, sin retardo. */
const STAGGERED_CARDS = 12

export default function Explore() {
  const { t } = useI18n()
  const [stack, setStack] = useState<Stack | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('newest')
  const [search, setSearch] = useState('')

  // Debounce de la búsqueda (la escritura no dispara una petición por tecla).
  const q = useDebouncedValue(search.trim(), 350)

  const filters = useMemo<ComponentFilters>(
    () => ({ stack, sort, q: q || undefined }),
    [stack, sort, q],
  )

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, isPlaceholderData } =
    useExploreComponents(filters)

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data])
  const total = data?.pages[0]?.meta.total ?? 0

  /*
   * Cuando la búsqueda exacta no encuentra nada, el backend reintenta por
   * parecido y lo dice en `search.fuzzy`. Sin avisarlo, buscar "carusel"
   * devolvería componentes que no contienen esa palabra y parecería que el
   * buscador no entiende lo que se le pide.
   *
   * El término sale de la RESPUESTA y no del input: mientras llega la petición
   * el usuario puede haber seguido escribiendo, y el aviso tiene que hablar de
   * lo que se buscó de verdad.
   */
  const searchMeta = data?.pages[0]?.search
  const didYouMean = searchMeta?.fuzzy ? searchMeta.term : null

  // Centinela de scroll infinito.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Cabecera + filtros, en cascada al montar la página */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <motion.div variants={fadeUpItem}>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              {t('explore.eyebrow')}
            </p>
            <AccentedTitle text={t('explore.title')} className="mt-2 text-4xl" />
            <p className="mt-2 text-muted">{t('explore.subtitle')}</p>
          </motion.div>

          {/* Barra de filtros */}
          <motion.div variants={fadeUpItem} className="mt-8 flex flex-wrap items-center gap-3">
            {/* Stack */}
            <div className="flex flex-wrap gap-2">
              <StackChip active={stack === undefined} onClick={() => setStack(undefined)}>
                {t('explore.allStacks')}
              </StackChip>
              {STACKS.map((s) => (
                <StackChip key={s} active={stack === s} onClick={() => setStack(s)}>
                  {t(`studio.stack.${s}`)}
                </StackChip>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('explore.searchPlaceholder')}
                  className="h-11 w-48 rounded-md border border-border bg-bg pl-9 pr-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
                />
              </div>
              {/* Orden */}
              <Select
                aria-label={t('explore.sort')}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-44"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`explore.sortOptions.${option}`)}
                  </option>
                ))}
              </Select>
            </div>
          </motion.div>
        </motion.div>

        {/* Rejilla masonry */}
        <div className="mt-8">
          {isLoading ? (
            <GridSkeleton />
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-20 text-center text-sm text-muted">
              {t('explore.empty')}
            </div>
          ) : (
            <>
              {didYouMean && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-text">
                  <Info className="mt-0.5 size-4 shrink-0 text-navy" />
                  <p>{t('explore.didYouMean', { term: didYouMean })}</p>
                </div>
              )}
              <p className="mb-4 font-mono text-xs text-muted">
                {t('explore.count', { count: total })}
              </p>
              {/* `isPlaceholderData`: al cambiar de filtro mantenemos la rejilla
                  anterior (sin parpadeo a skeleton) y solo la atenuamos mientras
                  llega la nueva.

                  La entrada de cada tarjeta va con `whileInView` + `once` en vez
                  de una cascada del contenedor: así las páginas siguientes del
                  scroll infinito también entran animadas, y ninguna se re-anima
                  al volver a pasar por encima. */}
              <Masonry
                items={items}
                getKey={(component) => component.id}
                renderItem={(component, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{
                      type: 'spring',
                      stiffness: 210,
                      damping: 24,
                      // Solo la primera hornada entra escalonada; a partir de
                      // ahí cada tarjeta aparece al alcanzarla el scroll.
                      delay: index < STAGGERED_CARDS ? index * 0.04 : 0,
                    }}
                  >
                    <ComponentCard component={component} />
                  </motion.div>
                )}
                className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
              />
            </>
          )}

          {/* Centinela + spinner de carga incremental. Solo ocupan espacio si aún
              quedan páginas por cargar; si no, no dejan hueco muerto al final. */}
          {hasNextPage && (
            <>
              <div ref={sentinelRef} className="h-10" />
              {isFetchingNextPage && (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted" />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </AppShell>
  )
}

function StackChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-pill border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-muted hover:border-accent/40 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

function GridSkeleton() {
  const heights = [220, 280, 200, 320, 240, 300, 190, 260]
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {heights.map((h, i) => (
        <Skeleton key={i} style={{ height: h }} className="mb-4 break-inside-avoid rounded-lg" />
      ))}
    </div>
  )
}
