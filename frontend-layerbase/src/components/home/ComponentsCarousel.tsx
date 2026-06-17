/**
 * Carrusel de últimos componentes (Home).
 *
 * Híbrido: auto-avanza solo y se PAUSA al interactuar con las cards (hover del
 * ratón o arrastre/táctil). Navegación con flechas, drag-to-scroll con ratón y
 * swipe táctil nativo. Respeta prefers-reduced-motion (sin auto-avance).
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { useLatestComponents } from '@/features/marketplace/queries'
import { ComponentCard, ComponentCardSkeleton } from '@/components/home/ComponentCard'

const AUTOPLAY_MS = 3500
const GAP = 16

export function ComponentsCarousel() {
  const { t } = useI18n()
  const { data, isLoading } = useLatestComponents(8)
  const trackRef = useRef<HTMLDivElement>(null)

  // La pausa se activa solo al interactuar con las cards (no con toda la
  // sección), así el auto-avance es visible mientras no se interactúa.
  const [hovering, setHovering] = useState(false)
  const [dragging, setDragging] = useState(false)
  const paused = hovering || dragging

  const stepWidth = () => {
    const first = trackRef.current?.firstElementChild
    return first instanceof HTMLElement ? first.offsetWidth + GAP : 296
  }

  const scrollByCards = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * stepWidth(), behavior: 'smooth' })
  }

  // Auto-avance en bucle, desactivado al pausar o con movimiento reducido.
  useEffect(() => {
    const track = trackRef.current
    if (!track || paused || isLoading || !data?.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const id = window.setInterval(() => {
      const { scrollLeft, scrollWidth, clientWidth } = track
      if (scrollLeft + clientWidth >= scrollWidth - 4) {
        track.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        track.scrollBy({ left: stepWidth(), behavior: 'smooth' })
      }
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, isLoading, data])

  // Drag-to-scroll con ratón.
  const drag = useRef({ active: false, startX: 0, startScroll: 0 })
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    drag.current = { active: true, startX: e.clientX, startScroll: track.scrollLeft }
    setDragging(true)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !trackRef.current) return
    trackRef.current.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX)
  }
  const endDrag = () => {
    drag.current.active = false
    setDragging(false)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-6xl px-6 py-24"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl">
            {t('home.components.titleLead')}{' '}
            <span className="text-navy">{t('home.components.titleAccent')}</span>
          </h2>
          <p className="mt-2 max-w-md text-muted">{t('home.components.subtitle')}</p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <ArrowButton label={t('home.components.prev')} onClick={() => scrollByCards(-1)}>
            <ChevronLeft className="size-5" />
          </ArrowButton>
          <ArrowButton label={t('home.components.next')} onClick={() => scrollByCards(1)}>
            <ChevronRight className="size-5" />
          </ArrowButton>
        </div>
      </div>

      {data && data.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center text-muted">
          {t('home.components.empty')}
        </p>
      ) : (
        <div
          ref={trackRef}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="mt-8 flex cursor-grab gap-4 overflow-x-auto scroll-smooth pb-4 select-none snap-x snap-mandatory [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          {isLoading || !data
            ? Array.from({ length: 5 }).map((_, i) => <ComponentCardSkeleton key={i} />)
            : data.map((component) => <ComponentCard key={component.id} component={component} />)}
        </div>
      )}
    </motion.section>
  )
}

function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-pill border border-border bg-surface/60 text-muted backdrop-blur transition hover:border-accent hover:text-text active:scale-95"
    >
      {children}
    </button>
  )
}
