/**
 * Detalle público de un componente publicado (se abre desde la rejilla).
 *
 * Muestra la ficha completa (preview, descripción, README, tags, autor) y el
 * CTA de acceso al código según el modelo de negocio:
 *  - Invitado → invita a iniciar sesión.
 *  - Gratuito / comprado / propio → descarga (URL firmada temporal).
 *  - De pago sin comprar → CTA de compra (módulo de compras, pendiente).
 *
 * La portada sigue una cascada de tres pasos (ver `<Cover>`): imagen subida por
 * el autor → render en vivo del propio componente → placeholder de marca.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Loader2, Lock, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { PriceBadge, Tag } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { fadeUpItem, staggerContainer } from '@/lib/motion'
import { useAuth } from '@/auth/AuthContext'
import { getErrorMessage } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { useI18n } from '@/i18n/useI18n'
import { MarkdownBody } from '@/studio/MarkdownEditor'
import { componentsApi } from '@/studio/api'
import { ComponentSandbox } from '@/studio/ComponentSandbox'
import { useComponent, usePreviewCode } from '@/studio/hooks'
import { componentGradient } from '@/studio/placeholder'
import type { Component } from '@/studio/types'

export default function ComponentDetail() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated } = useAuth()
  const { data: component, isLoading } = useComponent(slug)
  const [downloading, setDownloading] = useState(false)

  // Portada: la imagen del autor manda. Si no la ha subido, renderizamos el
  // componente en vivo, que solo es posible si es React, tiene código y el
  // espectador puede acceder a ese código (gratuito / comprado / propio).
  // Se calcula antes de los early returns: los hooks no pueden ir después.
  const coverImage = component?.preview_url ?? component?.thumbnail_url ?? null
  const canRenderLive =
    !!component &&
    !coverImage &&
    component.stack === 'react' &&
    component.has_source === true &&
    component.can_download_source
  const liveCode = usePreviewCode(component?.slug, canRenderLive)

  if (isLoading) {
    return (
      <AppShell>
        <ComponentDetailSkeleton />
      </AppShell>
    )
  }

  if (!component) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center text-muted">
          <p className="font-mono">404</p>
          <Link to="/components" className="mt-3 inline-block text-accent hover:underline">
            {t('explore.title')}
          </Link>
        </div>
      </AppShell>
    )
  }

  const readme = component.files?.find((file) => file.type === 'readme')

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { url } = await componentsApi.download(component.slug)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AppShell>
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl px-6 py-12"
      >
        <motion.button
          variants={fadeUpItem}
          type="button"
          onClick={() => navigate('/components')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text"
        >
          <ArrowLeft className="size-4" />
          {t('explore.title')}
        </motion.button>

        <motion.div variants={fadeUpItem}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl">{component.title}</h1>
            <PriceBadge price={component.price} isFree={component.is_free} />
          </div>

          {/* Autor + meta. Alineado a una línea base común (items-center) y con
              separadores '·' como elementos propios para que no se peguen al
              texto ni desalineen respecto al avatar. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            {component.author && (
              <span className="inline-flex items-center gap-2">
                {component.author.avatar_url ? (
                  <img src={component.author.avatar_url} alt="" className="size-5 rounded-full" />
                ) : (
                  <span className="grid size-5 place-items-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
                    {component.author.name.charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Mismo tamaño que los chips de stack/categoría para que la
                    línea de meta quede alineada; el nombre va en Syne. */}
                <span className="font-display text-xs font-semibold text-text">
                  {component.author.name}
                </span>
              </span>
            )}
            {component.author && <span className="text-border">·</span>}
            <span className="font-mono text-xs">{t(`studio.stack.${component.stack}`)}</span>
            {component.category && (
              <>
                <span className="text-border">·</span>
                <span className="font-mono text-xs">{component.category.name}</span>
              </>
            )}
          </div>
        </motion.div>

        {/* Portada (ver cascada en la cabecera del archivo) */}
        <motion.div variants={fadeUpItem} className="mt-6">
          <Cover
            component={component}
            image={coverImage}
            live={
              canRenderLive
                ? { code: liveCode.data, loading: liveCode.isLoading, failed: liveCode.isError }
                : null
            }
          />
        </motion.div>

        {/* Descripción */}
        <motion.p variants={fadeUpItem} className="mt-6 text-lg leading-relaxed text-text">
          {component.description}
        </motion.p>

        {/* Tags */}
        {component.tags && component.tags.length > 0 && (
          <motion.div variants={fadeUpItem} className="mt-4 flex flex-wrap gap-2">
            {component.tags.map((tag) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </motion.div>
        )}

        {/* CTA de acceso */}
        <motion.div variants={fadeUpItem} className="mt-8">
          <AccessCta
            component={component}
            isAuthenticated={isAuthenticated}
            downloading={downloading}
            onDownload={handleDownload}
          />
        </motion.div>

        {/* README */}
        {readme?.url && <Readme url={readme.url} />}
      </motion.main>
    </AppShell>
  )
}

/**
 * Portada de la ficha, en cascada de tres pasos:
 *  1. Imagen subida por el autor (o thumbnail): manda siempre que exista.
 *  2. Render en vivo en el sandbox, con el propio código del componente.
 *  3. Placeholder de marca — último recurso: componente de pago, no React, sin
 *     código subido, o el render falló.
 */
function Cover({
  component,
  image,
  live,
}: {
  component: Component
  image: string | null
  live: { code?: string; loading: boolean; failed: boolean } | null
}) {
  const { t } = useI18n()

  if (image) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <img src={image} alt={component.title} className="w-full object-cover" />
      </div>
    )
  }

  if (live && !live.failed) {
    return (
      <div>
        <div className="overflow-hidden rounded-lg border border-border">
          {live.loading || !live.code ? (
            <div className="flex aspect-[16/9] items-center justify-center bg-surface">
              <Loader2 className="size-6 animate-spin text-muted" />
            </div>
          ) : (
            <ComponentSandbox code={live.code} />
          )}
        </div>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {t('explore.livePreview')}
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg border border-border"
      style={{ background: componentGradient(component.slug) }}
    >
      <span className="px-6 text-center font-display text-2xl font-bold text-white/90">
        {component.title}
      </span>
    </div>
  )
}

function AccessCta({
  component,
  isAuthenticated,
  downloading,
  onDownload,
}: {
  component: Component
  isAuthenticated: boolean
  downloading: boolean
  onDownload: () => void
}) {
  const { t } = useI18n()

  if (!isAuthenticated) {
    return (
      <Link to="/login">
        <Button variant="secondary" icon={<Lock className="size-4" />}>
          {t('explore.loginToAccess')}
        </Button>
      </Link>
    )
  }

  if (component.can_download_source) {
    return (
      <Button loading={downloading} onClick={onDownload} icon={<Download className="size-4" />}>
        {t('studio.actions.download')}
      </Button>
    )
  }

  // De pago sin acceso: compra (módulo pendiente).
  return (
    <Button
      variant="primary"
      icon={<ShoppingCart className="size-4" />}
      onClick={() => toast.info(t('explore.purchaseSoon'))}
    >
      {t('explore.buyFor', { price: formatPrice(component.price) })}
    </Button>
  )
}

/** Descarga el Markdown del README y lo renderiza. */
function Readme({ url }: { url: string }) {
  const { t } = useI18n()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['readme', url],
    queryFn: async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('readme fetch failed')
      return res.text()
    },
  })

  if (isLoading || isError || !data) return null

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {t('studio.form.sectionReadme')}
      </h2>
      <MarkdownBody source={data} />
    </section>
  )
}

/** Skeleton de la ficha mientras carga (replica el layout real). */
function ComponentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Skeleton className="mb-6 h-5 w-40" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-6 w-16 rounded-pill" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="mt-6 aspect-[16/9] w-full rounded-lg" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-pill" />
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-14 rounded-pill" />
      </div>
      <Skeleton className="mt-8 h-11 w-44 rounded-md" />
    </div>
  )
}
