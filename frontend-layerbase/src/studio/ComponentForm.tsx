/**
 * #18 Subir nuevo componente / #19 Editar componente.
 *
 * Un único formulario para crear (POST /components, nace en draft) y editar
 * (PATCH). Incluye metadata, selector de stack y categoría, gestión de tags,
 * modelo de distribución (Gratis / Precio fijo — el MVP no soporta donativo ni
 * pay-what-you-want), Monaco para el código y editor Markdown para el README.
 *
 * En modo edición, si el componente está publicado el formulario se bloquea:
 * hay que despublicarlo antes de poder editarlo (regla de la ComponentPolicy).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Badge'
import { getErrorMessage } from '@/lib/api'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { CodeEditor } from '@/studio/CodeEditor'
import { MarkdownEditor } from '@/studio/MarkdownEditor'
import { TagInput } from '@/studio/TagInput'
import { componentsApi } from '@/studio/api'
import {
  componentKeys,
  useCategories,
  useComponent,
  useUnpublishComponent,
} from '@/studio/hooks'
import { codeToSourceFile, readmeToFile } from '@/studio/zip'
import { STACKS, type Stack } from '@/studio/types'
import { useQueryClient } from '@tanstack/react-query'

interface FormValues {
  title: string
  description: string
  stack: Stack
  category_id: number | ''
  distribution: 'free' | 'paid'
  price: number
  tags: string[]
}

export default function ComponentForm({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { slug } = useParams<{ slug: string }>()

  const { data: existing, isLoading: loadingExisting } = useComponent(mode === 'edit' ? slug : undefined)
  const unpublish = useUnpublishComponent()

  const [code, setCode] = useState('')
  const [readme, setReadme] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      stack: 'react',
      category_id: '',
      distribution: 'free',
      price: 0,
      tags: [],
    },
  })

  // useWatch (en vez de watch()) es memoizable y evita el aviso del compilador.
  const stack = useWatch({ control, name: 'stack' })
  const distribution = useWatch({ control, name: 'distribution' })
  const tags = useWatch({ control, name: 'tags' }) ?? []
  const { data: categories } = useCategories(stack)

  // Prefill en modo edición cuando llega el componente.
  useEffect(() => {
    if (mode === 'edit' && existing) {
      reset({
        title: existing.title,
        description: existing.description,
        stack: existing.stack,
        category_id: existing.category?.id ?? '',
        distribution: existing.is_free ? 'free' : 'paid',
        price: Number.parseFloat(existing.price),
        tags: existing.tags?.map((tag) => tag.name) ?? [],
      })
    }
  }, [mode, existing, reset])

  const isPublished = existing?.status === 'published'
  const locked = mode === 'edit' && isPublished

  const onSubmit = async (values: FormValues) => {
    if (values.category_id === '') {
      toast.error(t('studio.form.categoryPlaceholder'))
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: values.title,
        description: values.description,
        stack: values.stack,
        category_id: values.category_id,
        price: values.distribution === 'free' ? 0 : Number(values.price),
        tags: values.tags,
      }

      const component =
        mode === 'create'
          ? await componentsApi.create(payload)
          : await componentsApi.update(slug as string, payload)

      // Subida de archivos derivados (best-effort, tras guardar la metadata).
      if (code.trim()) {
        await componentsApi.uploadFile(component.slug, codeToSourceFile(code, values.stack), 'source')
      }
      if (readme.trim()) {
        await componentsApi.uploadFile(component.slug, readmeToFile(readme), 'readme')
      }

      void qc.invalidateQueries({ queryKey: componentKeys.all })
      toast.success(mode === 'create' ? t('studio.toast.created') : t('studio.toast.saved'))
      navigate(`/studio/${component.slug}`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'edit' && loadingExisting) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <button
          type="button"
          onClick={() => navigate('/studio')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text"
        >
          <ArrowLeft className="size-4" />
          {t('studio.list.title')}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-3xl">
              {mode === 'create' ? t('studio.form.newTitle') : t('studio.form.editTitle')}
            </h1>
            {mode === 'edit' && existing && <StatusBadge status={existing.status} />}
          </div>
          <p className="mt-2 text-muted">
            {mode === 'create' ? t('studio.form.newSubtitle') : t('studio.form.editSubtitle')}
          </p>
        </motion.div>

        {/* Aviso de bloqueo si está publicado */}
        {locked && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <span>{t('studio.form.publishedLock')}</span>
            <Button
              variant="danger"
              size="sm"
              loading={unpublish.isPending}
              onClick={() => unpublish.mutate(slug as string)}
            >
              {t('studio.actions.unpublish')}
            </Button>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn('mt-8 space-y-8', locked && 'pointer-events-none opacity-60')}
        >
          {/* Información */}
          <Section title={t('studio.form.sectionMeta')}>
            <Input
              label={t('studio.form.name')}
              placeholder={t('studio.form.namePlaceholder')}
              required
              error={errors.title && t('studio.form.name')}
              {...register('title', { required: true, maxLength: 150 })}
            />
            <Textarea
              label={t('studio.form.description')}
              placeholder={t('studio.form.descriptionPlaceholder')}
              required
              maxLength={500}
              error={errors.description && t('studio.form.description')}
              {...register('description', { required: true, maxLength: 500 })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t('studio.form.stack')} required {...register('stack', { required: true })}>
                {STACKS.map((s) => (
                  <option key={s} value={s}>
                    {t(`studio.stack.${s}`)}
                  </option>
                ))}
              </Select>
              <Select
                label={t('studio.form.category')}
                required
                error={errors.category_id && t('studio.form.categoryPlaceholder')}
                {...register('category_id', { required: true, valueAsNumber: true })}
              >
                <option value="">{t('studio.form.categoryPlaceholder')}</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>
            <TagInput
              value={tags}
              onChange={(next) => setValue('tags', next)}
              label={t('studio.form.tags')}
              placeholder={t('studio.form.tagsPlaceholder')}
              hint={t('studio.form.tagsHint')}
            />

            {/* Modelo de distribución (Gratis / Precio fijo) */}
            <div>
              <p className="mb-2 block text-sm font-medium text-text">
                {t('studio.form.distribution')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <DistOption
                  active={distribution === 'free'}
                  accent="success"
                  onClick={() => {
                    setValue('distribution', 'free')
                    setValue('price', 0)
                  }}
                >
                  {t('studio.form.distFree')}
                </DistOption>
                <DistOption
                  active={distribution === 'paid'}
                  accent="accent"
                  onClick={() => setValue('distribution', 'paid')}
                >
                  {t('studio.form.distPaid')}
                </DistOption>
              </div>
              {distribution === 'paid' && (
                <div className="mt-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    label={t('studio.form.price')}
                    placeholder={t('studio.form.pricePlaceholder')}
                    hint={t('studio.form.priceHint')}
                    {...register('price', { valueAsNumber: true, min: 0 })}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Código */}
          <Section title={t('studio.form.sectionCode')}>
            <CodeEditor
              value={code}
              onChange={setCode}
              stack={stack}
              label={t('studio.form.codeLabel')}
              hint={t('studio.form.codeHint')}
            />
          </Section>

          {/* README */}
          <Section title={t('studio.form.sectionReadme')}>
            <MarkdownEditor
              value={readme}
              onChange={setReadme}
              hint={t('studio.form.readmeHint')}
              placeholder={'# Título\n\nCómo se usa este componente…'}
            />
          </Section>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-6">
            <Button type="button" variant="ghost" onClick={() => navigate('/studio')}>
              {t('studio.form.cancel')}
            </Button>
            {stack === 'react' && code.trim() !== '' && (
              <Button
                type="button"
                variant="secondary"
                icon={<Eye className="size-4" />}
                onClick={() => navigate('/studio/preview', { state: { code, stack } })}
              >
                {t('studio.actions.preview')}
              </Button>
            )}
            <Button type="submit" loading={submitting} disabled={locked}>
              {mode === 'create' ? t('studio.form.publish') : t('studio.form.save')}
            </Button>
          </div>
        </form>
      </main>
    </AppShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{title}</h2>
      {children}
    </section>
  )
}

function DistOption({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean
  accent: 'success' | 'accent'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-4 py-3 text-sm font-medium transition',
        active
          ? accent === 'success'
            ? 'border-success bg-success/10 text-success'
            : 'border-accent bg-accent/10 text-accent'
          : 'border-border text-muted hover:border-accent/40 hover:text-text',
      )}
    >
      {children}
    </button>
  )
}
