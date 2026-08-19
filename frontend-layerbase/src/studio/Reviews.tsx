/**
 * Valoraciones de un componente, en su ficha pública.
 *
 * Las reglas de quién puede valorar las decide el backend (`ReviewPolicy`);
 * aquí solo se refleja el resultado, para no ofrecer un formulario que va a
 * devolver 403. Se oculta a: invitados, al autor del componente y a quien ya
 * valoró — a este último se le ofrece editar la suya en su lugar.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Pencil, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/auth/useAuth'
import { useI18n } from '@/i18n/useI18n'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useCreateReview,
  useDeleteReview,
  useReportReview,
  useReviews,
  useUpdateReview,
} from '@/studio/hooks'
import type { Component, Review } from '@/studio/types'

/** Mismo mínimo que valida el backend (§9 del modelo de datos). */
const MIN_BODY = 20

export function Reviews({ component }: { component: Component }) {
  const { t } = useI18n()
  const { user, isAuthenticated } = useAuth()
  const { data, isLoading } = useReviews(component.slug)

  const reviews = data?.data ?? []
  const mine = reviews.find((review) => review.is_mine)

  const isAuthor = user?.id === component.author?.id
  // El backend exige email verificado; anticiparlo evita un 403 sin explicación.
  const canReview = isAuthenticated && !isAuthor && !mine && user?.email_verified_at != null

  return (
    <section className="mt-12 border-t border-border pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-text">{t('reviews.title')}</h2>
        <Summary component={component} />
      </div>

      {canReview && <ReviewForm slug={component.slug} />}

      {isAuthenticated && !isAuthor && !mine && user?.email_verified_at == null && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {t('reviews.needsVerification')}
        </p>
      )}

      {!isAuthenticated && (
        <p className="mt-4 text-sm text-muted">
          <Link to="/login" className="text-accent hover:underline">
            {t('reviews.loginToReview')}
          </Link>
        </p>
      )}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : reviews.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-10 text-center text-sm text-muted">
            {t('reviews.empty')}
          </p>
        ) : (
          reviews.map((review) => (
            <ReviewRow key={review.id} review={review} slug={component.slug} />
          ))
        )}
      </div>
    </section>
  )
}

/** Nota media. Sin valoraciones no se enseña un 0, que se leería como "pésimo". */
function Summary({ component }: { component: Component }) {
  const { t } = useI18n()
  const average = component.rating_avg !== null ? Number.parseFloat(component.rating_avg) : null

  if (average === null || component.rating_count === 0) {
    return <span className="text-sm text-muted">{t('reviews.none')}</span>
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <Stars value={Math.round(average)} />
      <span className="font-semibold text-text">{average.toFixed(1)}</span>
      <span className="text-muted">
        {t('reviews.count', { count: component.rating_count })}
      </span>
    </span>
  )
}

/** Estrellas de solo lectura. El número va siempre al lado: la forma sola no basta. */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'size-3.5',
            star <= value ? 'fill-warning text-warning' : 'text-border',
          )}
        />
      ))}
    </span>
  )
}

/** Selector de estrellas: botones reales, para que funcione con teclado. */
function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={t('reviews.starLabel', { count: star })}
          aria-pressed={value === star}
          className="transition hover:scale-110"
        >
          <Star
            className={cn('size-6', star <= value ? 'fill-warning text-warning' : 'text-border')}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ slug }: { slug: string }) {
  const { t } = useI18n()
  const create = useCreateReview(slug)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')

  const valid = rating > 0 && body.trim().length >= MIN_BODY

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid) return
    create.mutate(
      { rating, body: body.trim() },
      { onSuccess: () => { setRating(0); setBody('') } },
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-lg border border-border bg-surface p-5">
      <StarPicker value={rating} onChange={setRating} />
      <div className="mt-4">
        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('reviews.placeholder')}
          hint={t('reviews.hint', { min: MIN_BODY })}
          maxLength={2000}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" loading={create.isPending} disabled={!valid}>
          {t('reviews.publish')}
        </Button>
      </div>
    </form>
  )
}

function ReviewRow({ review, slug }: { review: Review; slug: string }) {
  const { t, lang } = useI18n()
  const { isAuthenticated } = useAuth()
  const update = useUpdateReview(slug)
  const remove = useDeleteReview(slug)
  const report = useReportReview(slug)

  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(review.rating)
  const [body, setBody] = useState(review.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')

  const save = () => {
    if (body.trim().length < MIN_BODY) return
    update.mutate(
      { id: review.id, payload: { rating, body: body.trim() } },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Los nombres de usuario van SIEMPRE en Syne. */}
            {review.author && (
              <Link
                to={`/users/${review.author.id}`}
                className="font-display text-sm font-semibold text-text hover:text-accent"
              >
                {review.author.name}
              </Link>
            )}
            <Stars value={review.rating} />
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {timeAgo(review.created_at, lang)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {review.is_mine ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('reviews.edit')}
                onClick={() => setEditing((value) => !value)}
                icon={<Pencil className="size-3.5" />}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('reviews.delete')}
                onClick={() => setConfirmDelete(true)}
                icon={<Trash2 className="size-3.5 text-danger" />}
              />
            </>
          ) : (
            isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('reviews.report')}
                onClick={() => setReporting((value) => !value)}
                icon={<Flag className="size-3.5" />}
              />
            )
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-4">
          <StarPicker value={rating} onChange={setRating} />
          <div className="mt-3">
            <Textarea
              name={`body-${review.id}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {t('reviews.cancel')}
            </Button>
            <Button
              size="sm"
              loading={update.isPending}
              disabled={body.trim().length < MIN_BODY}
              onClick={save}
            >
              {t('reviews.save')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{review.body}</p>
      )}

      {reporting && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <Textarea
            name={`reason-${review.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reviews.reportPlaceholder')}
            hint={t('reviews.reportHint')}
            maxLength={1000}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReporting(false)}>
              {t('reviews.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={report.isPending}
              disabled={reason.trim().length < 10}
              onClick={() =>
                report.mutate(
                  { id: review.id, reason: reason.trim() },
                  { onSuccess: () => { setReporting(false); setReason('') } },
                )
              }
            >
              {t('reviews.sendReport')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('reviews.confirmDelete')}
        description={t('reviews.confirmDeleteBody')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate(review.id, { onSettled: () => setConfirmDelete(false) })}
      />
    </article>
  )
}
