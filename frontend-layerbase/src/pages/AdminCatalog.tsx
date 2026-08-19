/**
 * Panel de admin — catálogo: categorías y etiquetas.
 *
 * Hasta ahora las categorías solo se podían tocar por seeder y las etiquetas
 * las creaban los autores sin ningún control, así que el catálogo crecía sin
 * que nadie pudiera podarlo.
 *
 * La página trata las dos cosas distinto a propósito, porque lo son: una
 * CATEGORÍA es estructura y la crea un admin; una ETIQUETA la crea cualquier
 * autor al escribirla, así que aquí no se crean — solo se revisan y se limpian
 * las que se quedaron sin uso.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil, ShieldCheck, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { AccentedTitle } from '@/components/ui/AccentedTitle'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tag as TagPill } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { AdminNav } from '@/admin/AdminNav'
import {
  useAdminCategories,
  useAdminTags,
  useCreateCategory,
  useDeleteCategory,
  useDeleteTag,
  usePurgeOrphanTags,
  useUpdateCategory,
} from '@/admin/hooks'
import type { AdminCategory } from '@/admin/api'
import { STACKS, type Stack } from '@/studio/types'

const STACK_OPTIONS: Array<Stack | 'all'> = ['all', ...STACKS]

export default function AdminCatalog() {
  const { t } = useI18n()

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/60 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-accent backdrop-blur">
            <ShieldCheck className="size-3.5" />
            {t('admin.badge')}
          </div>
          <AccentedTitle text={t('admin.catalog.title')} className="mt-4 text-4xl" />
          <p className="mt-3 max-w-xl text-muted">{t('admin.catalog.body')}</p>
        </motion.div>

        <AdminNav />

        <Categories />
        <Tags />
      </main>
    </AppShell>
  )
}

/* -------------------------------------------------------------------------- */

function Categories() {
  const { t } = useI18n()
  const { data, isLoading } = useAdminCategories()
  const create = useCreateCategory()

  const [name, setName] = useState('')
  const [stack, setStack] = useState<Stack | 'all'>('all')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate(
      { name: name.trim(), stack },
      { onSuccess: () => { setName(''); setStack('all') } },
    )
  }

  return (
    <section className="mt-8">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {t('admin.catalog.categories')}
      </h2>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.catalog.newPlaceholder')}
          maxLength={100}
        />
        <Select value={stack} onChange={(e) => setStack(e.target.value as Stack | 'all')} name="stack">
          {STACK_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? t('admin.catalog.allStacks') : t(`studio.stack.${option}`)}
            </option>
          ))}
        </Select>
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          {t('admin.catalog.add')}
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </>
        ) : (
          data?.map((category) => <CategoryRow key={category.id} category={category} />)
        )}
      </div>
    </section>
  )
}

function CategoryRow({ category }: { category: AdminCategory }) {
  const { t } = useI18n()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [confirm, setConfirm] = useState(false)

  // El total incluye borradores y despublicados; es lo que la FK protege.
  const total = category.total_components ?? category.components_count
  const inUse = total > 0

  const save = () => {
    if (!name.trim() || name.trim() === category.name) {
      setEditing(false)
      return
    }
    update.mutate(
      { slug: category.slug, payload: { name: name.trim() } },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            name={`name-${category.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9"
            autoFocus
          />
        ) : (
          <p className="truncate font-semibold text-text">{category.name}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
          <span>{category.slug}</span>
          <TagPill>
            {category.stack === 'all' ? t('admin.catalog.allStacks') : category.stack}
          </TagPill>
          <span>{t('admin.catalog.published', { count: category.components_count })}</span>
          {/* Solo se enseña el total si difiere: si no, es ruido. */}
          {total !== category.components_count && (
            <span>{t('admin.catalog.total', { count: total })}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <Button
              size="sm"
              loading={update.isPending}
              onClick={save}
              icon={<Check className="size-3.5" />}
            >
              {t('admin.catalog.save')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('admin.catalog.cancel')}
              onClick={() => { setName(category.name); setEditing(false) }}
              icon={<X className="size-3.5" />}
            />
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              icon={<Pencil className="size-3.5" />}
            >
              {t('admin.catalog.rename')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              // Deshabilitado con explicación en el title: mejor que dejar
              // pulsar y devolver un error que ya sabíamos.
              disabled={inUse}
              title={inUse ? t('admin.catalog.inUse', { count: total }) : undefined}
              aria-label={t('admin.catalog.delete')}
              onClick={() => setConfirm(true)}
              icon={<Trash2 className={cn('size-3.5', !inUse && 'text-danger')} />}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('admin.catalog.confirmDelete', { name: category.name })}
        description={t('admin.catalog.confirmDeleteBody')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate(category.slug, { onSettled: () => setConfirm(false) })}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Tags() {
  const { t } = useI18n()
  const [onlyOrphan, setOnlyOrphan] = useState(false)
  const { data, isLoading } = useAdminTags(onlyOrphan)
  const purge = usePurgeOrphanTags()
  const removeTag = useDeleteTag()
  const [confirmPurge, setConfirmPurge] = useState(false)

  const orphanCount = data?.filter((tag) => (tag.total_components ?? 0) === 0).length ?? 0

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {t('admin.catalog.tags')}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant={onlyOrphan ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setOnlyOrphan((value) => !value)}
          >
            {t('admin.catalog.onlyOrphan')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={orphanCount === 0}
            onClick={() => setConfirmPurge(true)}
            icon={<Trash2 className="size-3.5 text-danger" />}
          >
            {t('admin.catalog.purge')}
          </Button>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted">{t('admin.catalog.tagsHint')}</p>

      {isLoading ? (
        <Skeleton className="mt-4 h-24 rounded-lg" />
      ) : data && data.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.map((tag) => {
            const used = (tag.total_components ?? 0) > 0
            return (
              <span
                key={tag.id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-pill border px-3 py-1 font-mono text-xs',
                  used
                    ? 'border-border bg-navy-50 text-navy'
                    : 'border-dashed border-border text-muted',
                )}
              >
                {tag.name}
                <span className="opacity-70">{tag.total_components ?? 0}</span>
                {!used && (
                  <button
                    type="button"
                    aria-label={t('admin.catalog.delete')}
                    disabled={removeTag.isPending}
                    onClick={() => removeTag.mutate(tag.slug)}
                    className="text-danger transition-opacity hover:opacity-70"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-surface/50 px-6 py-10 text-center text-sm text-muted">
          {t('admin.catalog.noTags')}
        </p>
      )}

      <ConfirmDialog
        open={confirmPurge}
        onOpenChange={setConfirmPurge}
        title={t('admin.catalog.confirmPurge')}
        description={t('admin.catalog.confirmPurgeBody', { count: orphanCount })}
        loading={purge.isPending}
        onConfirm={() => purge.mutate(undefined, { onSettled: () => setConfirmPurge(false) })}
      />
    </section>
  )
}
