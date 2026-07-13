/**
 * Vista principal pública del marketplace — rejilla tipo Pinterest (masonry).
 *
 * - Orden por defecto: cronológico ASCENDENTE (lo más antiguo primero), con un
 *   selector para cambiarlo.
 * - Scroll infinito con IntersectionObserver sobre un centinela al final.
 * - Filtros ligeros: stack, búsqueda de texto (con debounce) y orden.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Search } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Select } from '@/components/ui/Field'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { ComponentCard } from '@/studio/ComponentCard'
import { useExploreComponents } from '@/studio/hooks'
import type { ComponentFilters } from '@/studio/api'
import { STACKS, type Stack } from '@/studio/types'

type SortOption = NonNullable<ComponentFilters['sort']>
const SORT_OPTIONS: SortOption[] = ['oldest', 'newest', 'downloads', 'rating', 'price_asc', 'price_desc']

export default function Explore() {
  const { t } = useI18n()
  const [stack, setStack] = useState<Stack | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('oldest')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')

  // Debounce de la búsqueda (la escritura no dispara una petición por tecla).
  useEffect(() => {
    const id = window.setTimeout(() => setQ(search.trim()), 350)
    return () => window.clearTimeout(id)
  }, [search])

  const filters = useMemo<ComponentFilters>(
    () => ({ stack, sort, q: q || undefined }),
    [stack, sort, q],
  )

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useExploreComponents(filters)

  const items = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data])
  const total = data?.pages[0]?.meta.total ?? 0

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
        {/* Cabecera */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            {t('explore.eyebrow')}
          </p>
          <h1 className="mt-2 text-4xl">{t('explore.title')}</h1>
          <p className="mt-2 text-muted">{t('explore.subtitle')}</p>
        </motion.div>

        {/* Barra de filtros */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
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
                className="h-11 w-48 rounded-md border border-border bg-bg/50 pl-9 pr-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent"
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
        </div>

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
              <p className="mb-4 font-mono text-xs text-muted">
                {t('explore.count', { count: total })}
              </p>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                {items.map((component) => (
                  <ComponentCard key={component.id} component={component} />
                ))}
              </div>
            </>
          )}

          {/* Centinela + spinner de carga incremental */}
          <div ref={sentinelRef} className="h-10" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted" />
            </div>
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
        'rounded-pill border px-3 py-1.5 text-xs font-medium transition',
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
        <div
          key={i}
          style={{ height: h }}
          className="mb-4 animate-pulse break-inside-avoid rounded-lg border border-border bg-surface/60"
        />
      ))}
    </div>
  )
}
