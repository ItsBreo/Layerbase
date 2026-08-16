/**
 * Diálogo de suspensión de una cuenta.
 *
 * Como el de rechazo de componentes, el motivo es obligatorio: queda guardado
 * en `users.ban_reason` y es lo único que explica la suspensión después. El
 * aviso sobre los tokens no es decorativo — al suspender se revocan y la
 * persona pierde la sesión en el acto.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { User } from '@/auth/types'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { useI18n } from '@/i18n/useI18n'
import { useBanUser } from '@/admin/hooks'

/** Mismo mínimo que la regla `min:10` del BanUserRequest del backend. */
const MIN_REASON_LENGTH = 10

export function BanDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}) {
  const { t } = useI18n()
  const ban = useBanUser()
  const [reason, setReason] = useState('')

  const isValid = reason.trim().length >= MIN_REASON_LENGTH

  function handleConfirm() {
    if (!isValid) return
    ban.mutate(
      { id: user.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-elevated"
          >
            <Dialog.Title className="text-lg">
              {t('admin.users.ban.title', { name: user.name })}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted">
              {t('admin.users.ban.body')}
            </Dialog.Description>

            <div className="mt-5">
              <Textarea
                name="reason"
                required
                label={t('admin.users.ban.label')}
                placeholder={t('admin.users.ban.placeholder')}
                hint={t('admin.users.ban.hint')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  {t('admin.users.ban.cancel')}
                </Button>
              </Dialog.Close>
              <Button
                variant="danger"
                size="sm"
                disabled={!isValid}
                loading={ban.isPending}
                onClick={handleConfirm}
              >
                {t('admin.users.ban.confirm')}
              </Button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
