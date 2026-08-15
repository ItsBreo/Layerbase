/**
 * Diálogo de rechazo de un componente en moderación.
 *
 * No reutiliza <ConfirmDialog> porque aquí el rechazo no es un sí/no: el motivo
 * es OBLIGATORIO. Un rechazo mudo deja al autor sin saber qué corregir, así que
 * el botón de confirmar está deshabilitado hasta que hay motivo suficiente. El
 * backend valida lo mismo (min:10) y devolvería 422; esto solo evita el viaje.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { useI18n } from '@/i18n/useI18n'
import { useRejectComponent } from '@/studio/hooks'
import type { Component } from '@/studio/types'

/** Mismo mínimo que la regla `min:10` del RejectComponentRequest del backend. */
const MIN_REASON_LENGTH = 10

export function RejectDialog({
  open,
  onOpenChange,
  component,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  component: Component
}) {
  const { t } = useI18n()
  const reject = useRejectComponent()
  const [reason, setReason] = useState('')

  const isValid = reason.trim().length >= MIN_REASON_LENGTH

  function handleConfirm() {
    if (!isValid) return
    reject.mutate(
      { idOrSlug: component.slug, reason: reason.trim() },
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
              {t('admin.reject.title', { title: component.title })}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted">
              {t('admin.reject.body')}
            </Dialog.Description>

            <div className="mt-5">
              <Textarea
                name="reason"
                required
                label={t('admin.reject.label')}
                placeholder={t('admin.reject.placeholder')}
                hint={t('admin.reject.hint')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  {t('admin.reject.cancel')}
                </Button>
              </Dialog.Close>
              <Button
                variant="danger"
                size="sm"
                disabled={!isValid}
                loading={reject.isPending}
                onClick={handleConfirm}
              >
                {t('admin.reject.confirm')}
              </Button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
