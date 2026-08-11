/**
 * Tarjeta de componente para la rejilla pública tipo Pinterest.
 *
 * - Sin sombra en reposo; en hover eleva (translateY(-2px) + shadow-hover) y
 *   tiñe el borde de navy-200 — el look "premium y preciso" de la marca.
 * - La portada es `preview_url` (imagen subida por el autor, resuelta ya en el
 *   backend). En la rejilla no se monta el sandbox: renderizar N componentes en
 *   vivo no es viable, así que sin imagen se cae al placeholder.
 * - El placeholder es un degradado determinista a partir del slug, con altura
 *   variable para el efecto masonry.
 */
import { Link } from 'react-router-dom'
import { Download, Star } from 'lucide-react'
import { PriceBadge, Tag } from '@/components/ui/Badge'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { componentGradient, placeholderHeight } from '@/studio/placeholder'
import type { Component } from '@/studio/types'

function Placeholder({ component }: { component: Component }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        height: placeholderHeight(component.slug),
        background: componentGradient(component.slug),
      }}
    >
      <span className="px-4 text-center font-display text-lg font-bold text-white/90">
        {component.title}
      </span>
    </div>
  )
}

export function ComponentCard({ component }: { component: Component }) {
  const { t } = useI18n()
  const rating = component.rating_avg ? Number.parseFloat(component.rating_avg) : null
  const cover = component.preview_url ?? component.thumbnail_url

  return (
    <Link
      to={`/components/${component.slug}`}
      className={cn(
        'group block overflow-hidden rounded-lg border border-border bg-surface',
        'transition duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-hover',
      )}
    >
      {/* Media */}
      {cover ? (
        <img
          src={cover}
          alt={component.title}
          loading="lazy"
          className="w-full object-cover"
        />
      ) : (
        <Placeholder component={component} />
      )}

      {/* Cuerpo */}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-text group-hover:text-accent">
            {component.title}
          </h3>
          <PriceBadge price={component.price} isFree={component.is_free} className="shrink-0" />
        </div>

        <p className="line-clamp-2 text-sm text-muted">{component.description}</p>

        {/* Meta */}
        <div className="flex items-center justify-between pt-1 font-mono text-xs text-muted">
          <Tag>{t(`studio.stack.${component.stack}`)}</Tag>
          <div className="flex items-center gap-3">
            {rating !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3" />
                {rating.toFixed(1)}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Download className="size-3" />
              {component.downloads}
            </span>
          </div>
        </div>

        {/* Autor */}
        {component.author && (
          <div className="flex items-center gap-2 border-t border-border pt-2">
            {component.author.avatar_url ? (
              <img src={component.author.avatar_url} alt="" className="size-5 rounded-full" />
            ) : (
              <span className="grid size-5 place-items-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
                {component.author.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-display text-xs font-semibold text-muted">
              {component.author.name}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
