/**
 * Card de un componente del marketplace para el carrusel de la Home.
 * Mientras no haya preview real (thumbnailUrl), dibuja un wireframe estilizado.
 */
import { Download, Star } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import type { ComponentSummary } from '@/features/marketplace/types'

const STACK_META: Record<ComponentSummary['stack'], { label: string; color: string }> = {
  react: { label: 'React', color: '#61DAFB' },
  angular: { label: 'Angular', color: '#DD0031' },
  vanilla: { label: 'Vanilla JS', color: '#F7DF1E' },
}

const compact = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export function ComponentCard({ component }: { component: ComponentSummary }) {
  const { t } = useI18n()
  const stack = STACK_META[component.stack]

  return (
    <article className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface/70 backdrop-blur-xl transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-hover">
      {component.thumbnailUrl ? (
        <img
          src={component.thumbnailUrl}
          alt={component.title}
          className="aspect-[16/10] w-full border-b border-border object-cover"
          draggable={false}
        />
      ) : (
        <Wireframe variant={component.id % 3} />
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <span className="size-2 rounded-full" style={{ background: stack.color }} />
          {stack.label}
        </div>

        <h3 className="truncate text-base font-semibold text-text">{component.title}</h3>

        <div className="flex items-center gap-2">
          <Avatar name={component.author.name} url={component.author.avatarUrl} />
          <span className="truncate text-xs text-muted">
            {t('home.components.by')} {component.author.name}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="font-semibold text-text">
            {component.price === 0 ? t('home.components.free') : `$${component.price}`}
          </span>
          <div className="flex items-center gap-3 text-muted">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-warning text-warning" />
              {component.ratingAvg.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="size-3.5" />
              {compact(component.downloads)}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ComponentCardSkeleton() {
  return (
    <div className="w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface/40">
      <div className="aspect-[16/10] w-full animate-pulse border-b border-border bg-muted/10" />
      <div className="space-y-3 p-4">
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted/20" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted/20" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted/20" />
      </div>
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="size-6 rounded-full object-cover" draggable={false} />
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-navy/15 text-[10px] font-bold text-navy">
      {initials}
    </span>
  )
}

/** Maqueta wireframe (placeholder) con 3 variantes de layout. */
function Wireframe({ variant }: { variant: number }) {
  return (
    <div className="aspect-[16/10] w-full border-b border-border bg-bg/50 p-4">
      {variant === 0 && (
        <div className="flex h-full flex-col gap-2.5">
          <div className="h-3 w-1/3 rounded bg-muted/30" />
          <div className="h-2 w-full rounded bg-muted/15" />
          <div className="h-2 w-5/6 rounded bg-muted/15" />
          <div className="mt-auto flex gap-2">
            <div className="h-6 w-20 rounded-md bg-navy/30" />
            <div className="h-6 w-16 rounded-md bg-muted/20" />
          </div>
        </div>
      )}
      {variant === 1 && (
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={i === 0 ? 'rounded-md bg-navy/25' : 'rounded-md bg-muted/15'} />
          ))}
        </div>
      )}
      {variant === 2 && (
        <div className="flex h-full gap-2">
          <div className="w-1/4 rounded-md bg-navy/20" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-1/3 rounded-md bg-muted/20" />
            <div className="flex-1 rounded-md bg-muted/15" />
          </div>
        </div>
      )}
    </div>
  )
}
