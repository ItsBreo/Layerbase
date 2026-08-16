/**
 * Página de usuario (`/dashboard`): identidad, perfil público, resumen de autor
 * y cuenta. Solo accesible vía <ProtectedRoute>.
 *
 * Sustituye a las cuatro tarjetas de solo lectura que había antes: el email vive
 * ahora en el bloque de cuenta, el rol es un badge junto al nombre, la
 * verificación solo aparece si está pendiente y Stripe se va hasta que exista el
 * módulo de pagos (S3 del roadmap).
 *
 * El resumen de autor es PRIVADO por defecto; su dueño decide publicarlo con el
 * interruptor del bloque (`stats_public`).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { AlertCircle, Camera, Download, Layers, Lock, Star } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { useAuth } from '@/auth/useAuth'
import { authApi } from '@/Login/auth'
import { getErrorMessage } from '@/lib/api'
import { fadeUpItem, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/useI18n'
import type { UpdateProfilePayload, User } from '@/auth/types'

export default function Dashboard() {
  const { user, refresh } = useAuth()
  const { t } = useI18n()
  if (!user) return null

  return (
    <AppShell>
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-3xl px-6 py-16"
      >
        <motion.div variants={fadeUpItem}>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            {t('dashboard.eyebrow')}
          </p>
          <h1 className="mt-2 text-4xl">
            {t('dashboard.greeting')} <span className="text-navy">{user.name}</span>
          </h1>
          <p className="mt-2 text-muted">{t('dashboard.subtitle')}</p>
        </motion.div>

        <motion.div variants={fadeUpItem} className="mt-10">
          <IdentityHeader user={user} onUploaded={refresh} />
        </motion.div>

        {!user.email_verified_at && (
          <motion.div variants={fadeUpItem} className="mt-6">
            <VerificationNotice />
          </motion.div>
        )}

        <motion.div variants={fadeUpItem} className="mt-10">
          <ProfileForm user={user} onSaved={refresh} />
        </motion.div>

        <motion.div variants={fadeUpItem} className="mt-10">
          <AuthorSummary user={user} onToggled={refresh} />
        </motion.div>

        <motion.div variants={fadeUpItem} className="mt-10">
          <AccountSection user={user} />
        </motion.div>
      </motion.main>
    </AppShell>
  )
}

/* -------------------------------------------------------------------------- */

/** Avatar + nombre + rol + email. La foto se sube desde aquí. */
function IdentityHeader({ user, onUploaded }: { user: User; onUploaded: () => Promise<void> }) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const memberSince = useMemo(
    () => new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
    [user.created_at],
  )

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await authApi.updateAvatar(file)
      await onUploaded()
      toast.success(t('profile.toast.avatarUpdated'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setUploading(false)
      // Permite volver a elegir el mismo archivo tras un error.
      event.target.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border bg-surface/60 p-5 backdrop-blur-xl">
      <div className="relative">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-navy-50 font-display text-2xl font-bold text-navy">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={t('profile.avatar.change')}
          title={t('profile.avatar.change')}
          className="control-raised absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-pill border border-border text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
        >
          <Camera className="size-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFile}
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-xl font-bold text-text">{user.name}</p>
          <span className="rounded-pill bg-navy-50 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-navy">
            {t(`dashboard.roles.${user.role}`)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
        <p className="mt-0.5 text-xs text-muted">
          {t('profile.memberSince', { date: memberSince })}
        </p>
      </div>
    </div>
  )
}

/**
 * Aviso de email sin verificar. Ya no es solo informativo: sin verificar no se
 * puede enviar un componente a revisión, así que ofrece reenviar el correo.
 */
function VerificationNotice() {
  const { t } = useI18n()
  const [sending, setSending] = useState(false)

  const resend = async () => {
    setSending(true)
    try {
      const { message } = await authApi.resendVerification()
      toast.success(message)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p>{t('profile.verification.pending')}</p>
        <p className="mt-1 text-warning/80">{t('profile.verification.blocks')}</p>
      </div>
      <Button variant="secondary" size="sm" loading={sending} onClick={resend}>
        {t('profile.verification.resend')}
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

interface ProfileFormValues {
  name: string
  bio: string
  website: string
  github_username: string
  twitter_username: string
}

/** Perfil público: lo que ve cualquiera en la ficha de tus componentes. */
function ProfileForm({ user, onSaved }: { user: User; onSaved: () => Promise<void> }) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
      website: user.website ?? '',
      github_username: user.github_username ?? '',
      twitter_username: user.twitter_username ?? '',
    },
  })

  // Re-sincroniza si el usuario cambia por fuera (p. ej. tras subir avatar).
  useEffect(() => {
    reset({
      name: user.name,
      bio: user.bio ?? '',
      website: user.website ?? '',
      github_username: user.github_username ?? '',
      twitter_username: user.twitter_username ?? '',
    })
  }, [user, reset])

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true)
    try {
      // El backend normaliza handles y convierte '' en null.
      await authApi.updateProfile(values as UpdateProfilePayload)
      await onSaved()
      toast.success(t('profile.toast.saved'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title={t('profile.public.title')} description={t('profile.public.description')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('profile.fields.name')}
          required
          error={errors.name && t('profile.errors.name')}
          {...register('name', { required: true, minLength: 2, maxLength: 100 })}
        />
        <Textarea
          label={t('profile.fields.bio')}
          placeholder={t('profile.fields.bioPlaceholder')}
          maxLength={500}
          hint={t('profile.fields.bioHint')}
          {...register('bio', { maxLength: 500 })}
        />
        <Input
          type="url"
          label={t('profile.fields.website')}
          placeholder="https://"
          error={errors.website && t('profile.errors.website')}
          {...register('website')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('profile.fields.github')}
            placeholder="usuario"
            hint={t('profile.fields.handleHint')}
            {...register('github_username')}
          />
          <Input
            label={t('profile.fields.twitter')}
            placeholder="usuario"
            hint={t('profile.fields.handleHint')}
            {...register('twitter_username')}
          />
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" loading={saving} disabled={!isDirty}>
            {t('profile.actions.save')}
          </Button>
        </div>
      </form>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */

/** Resumen de autor + interruptor de visibilidad (privado por defecto). */
function AuthorSummary({ user, onToggled }: { user: User; onToggled: () => Promise<void> }) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const stats = user.stats
  const isPublic = user.stats_public ?? false

  const togglePublic = async () => {
    setSaving(true)
    try {
      await authApi.updateProfile({ stats_public: !isPublic })
      await onToggled()
      toast.success(!isPublic ? t('profile.toast.statsPublic') : t('profile.toast.statsPrivate'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title={t('profile.stats.title')} description={t('profile.stats.description')}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Layers} label={t('profile.stats.components')} value={stats?.components ?? 0} />
        <StatTile icon={Download} label={t('profile.stats.downloads')} value={stats?.downloads ?? 0} />
        <StatTile
          icon={Star}
          label={t('profile.stats.rating')}
          value={stats?.rating_avg != null ? stats.rating_avg.toFixed(1) : '—'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text">{t('profile.stats.visibility')}</p>
          <p className="text-xs text-muted">
            {isPublic ? t('profile.stats.isPublic') : t('profile.stats.isPrivate')}
          </p>
        </div>
        <Toggle checked={isPublic} disabled={saving} onChange={togglePublic} label={t('profile.stats.visibility')} />
      </div>

      <Link to="/studio" className="mt-4 inline-block text-sm text-accent hover:underline">
        {t('profile.stats.manage')}
      </Link>
    </Section>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-text">{value}</p>
    </div>
  )
}

/** Interruptor accesible (role=switch) con la estética de píldora de la marca. */
function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-pill border transition-colors disabled:opacity-60',
        checked ? 'border-accent bg-accent' : 'border-border bg-surface',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white shadow-card transition-all',
          checked ? 'left-[1.5rem]' : 'left-0.5',
        )}
      />
    </button>
  )
}

/* -------------------------------------------------------------------------- */

interface PasswordFormValues {
  current_password: string
  password: string
  password_confirmation: string
}

/** Cuenta: email y contraseña. */
function AccountSection({ user }: { user: User }) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  // Las cuentas de OAuth no tienen contraseña local que cambiar.
  const hasPassword = user.has_password !== false

  const {
    register,
    handleSubmit,
    reset,
    // `getValues` en vez de `watch` para comparar contraseñas: la validación
    // solo corre al enviar, no necesita reactividad, y watch() no es memoizable.
    getValues,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const onSubmit = async (values: PasswordFormValues) => {
    setSaving(true)
    try {
      await authApi.updatePassword(values)
      reset()
      toast.success(t('profile.toast.passwordUpdated'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title={t('profile.account.title')} description={t('profile.account.description')}>
      <Input label={t('profile.fields.email')} value={user.email} readOnly disabled hint={t('profile.fields.emailHint')} />

      {hasPassword ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 border-t border-border pt-6">
          <Input
            type="password"
            autoComplete="current-password"
            label={t('profile.fields.currentPassword')}
            required
            error={errors.current_password && t('profile.errors.currentPassword')}
            {...register('current_password', { required: true })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="password"
              autoComplete="new-password"
              label={t('profile.fields.newPassword')}
              required
              error={errors.password && t('profile.errors.password')}
              {...register('password', { required: true, minLength: 8 })}
            />
            <Input
              type="password"
              autoComplete="new-password"
              label={t('profile.fields.confirmPassword')}
              required
              error={errors.password_confirmation && t('profile.errors.confirmPassword')}
              {...register('password_confirmation', {
                required: true,
                validate: (value) => value === getValues('password'),
              })}
            />
          </div>
          <p className="text-xs text-muted">{t('profile.account.passwordNote')}</p>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={saving}>
              {t('profile.actions.changePassword')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-sm text-muted">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <p>{t('profile.account.oauthOnly')}</p>
        </div>
      )}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
      <h2 className="text-xl">{title}</h2>
      {description && <p className="mb-5 mt-1 text-sm text-muted">{description}</p>}
      {children}
    </section>
  )
}
