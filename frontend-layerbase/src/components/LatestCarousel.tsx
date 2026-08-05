/**
 * Carrusel horizontal de "últimos componentes" para la landing.
 *
 * Presentacional: recibe ya la lista de componentes. Se auto-desplaza en bucle
 * continuo (marquee) y se PAUSA al pasar el ratón, al enfocar con teclado o
 * durante una interacción táctil; las flechas permiten control manual. El bucle
 * es sin saltos: se renderiza el contenido DUPLICADO y, al llegar al inicio de
 * la 2ª copia (idéntica), se reinicia `scrollLeft` restando ese ancho exacto
 * (`offsetLeft` de la 2ª copia). Respeta `prefers-reduced-motion` (sin auto y
 * sin duplicar). Reusa tokens de marca, `PriceBadge`/`Tag` y el placeholder.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PriceBadge, Tag } from '@/components/ui/Badge'
import { useI18n } from '@/i18n/useI18n'
import { timeAgo } from '@/lib/format'
import { componentGradient } from '@/studio/placeholder'
import type { Component } from '@/studio/types'

const SPEED = 0.5 // px por frame (~30px/s a 60fps)

export function LatestCarousel({ components }: { components: Component[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const secondCopyRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)

  // ¿Animamos? Solo si el usuario no pide movimiento reducido.
  const [autoScroll, setAutoScroll] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setAutoScroll(!mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Bucle de auto-scroll.
  useEffect(() => {
    if (!autoScroll) return
    const track = trackRef.current
    if (!track) return

    let raf = 0
    const step = () => {
      if (!pausedRef.current) {
        const period = secondCopyRef.current?.offsetLeft ?? 0
        let next = track.scrollLeft + SPEED
        if (period > 0 && next >= period) next -= period
        track.scrollLeft = next
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [autoScroll, components.length])

  const scrollByCards = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' })
  }

  const pause = () => {
    pausedRef.current = true
  }
  const resume = () => {
    pausedRef.current = false
  }

  return (
    <div
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      onPointerDown={pause}
      onPointerUp={resume}
    >
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex shrink-0 gap-4">
          {components.map((component) => (
            <CarouselCard key={component.id} component={component} />
          ))}
        </div>
        {/* 2ª copia idéntica para el bucle sin saltos (solo si hay auto-scroll). */}
        {autoScroll && (
          <div ref={secondCopyRef} className="flex shrink-0 gap-4" aria-hidden>
            {components.map((component) => (
              <CarouselCard key={component.id} component={component} />
            ))}
          </div>
        )}
      </div>

      {/* Flechas (desktop): control manual; el hover ya pausa el auto-scroll. */}
      <ArrowButton direction="left" onClick={() => scrollByCards(-1)} />
      <ArrowButton direction="right" onClick={() => scrollByCards(1)} />
    </div>
  )
}

function ArrowButton({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const isLeft = direction === 'left'
  return (
    <button
      type="button"
      aria-label={isLeft ? 'Anterior' : 'Siguiente'}
      onClick={onClick}
      className={`absolute top-[38%] z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/90 text-text shadow-hover backdrop-blur transition hover:border-accent hover:text-accent active:scale-95 md:grid ${
        isLeft ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      }`}
    >
      {isLeft ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
    </button>
  )
}

function CarouselCard({ component }: { component: Component }) {
  const { t, lang } = useI18n()
  const published = timeAgo(component.published_at ?? component.created_at, lang)

  return (
    <Link
      to={`/components/${component.slug}`}
      className="group w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-hover"
    >
      {/* Preview: thumbnail si existe, si no el degradado de marca. */}
      <div className="h-36 overflow-hidden border-b border-border">
        {component.thumbnail_url ? (
          <img
            src={component.thumbnail_url}
            alt={component.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{ background: componentGradient(component.slug) }}
          >
            <span className="px-4 text-center font-display text-base font-bold text-white/90">
              {component.title}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        {published && (
          <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{published}</p>
        )}
        <h3 className="truncate font-display text-sm font-bold text-text group-hover:text-accent">
          {component.title}
        </h3>
        {component.author && (
          <p className="truncate font-mono text-xs text-muted">{component.author.name}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <Tag>{t(`studio.stack.${component.stack}`)}</Tag>
          <PriceBadge price={component.price} isFree={component.is_free} />
        </div>
      </div>
    </Link>
  )
}
