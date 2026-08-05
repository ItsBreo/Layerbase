/**
 * Diálogo de confirmación reutilizable (Radix Dialog).
 *
 * Para acciones sensibles (despublicar, eliminar). Radio xl (12px) de modal y
 * botón de confirmación tipado por variante (danger por defecto).
 */
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/Button'
import { useI18n } from '@/i18n/useI18n'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  trigger,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  loading?: boolean
  onConfirm: () => void
  trigger?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-elevated"
          >
            <Dialog.Title className="text-lg">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="mt-2 text-sm text-muted">
                {description}
              </Dialog.Description>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  {cancelLabel ?? t('studio.confirm.cancel')}
                </Button>
              </Dialog.Close>
              <Button variant={confirmVariant} size="sm" loading={loading} onClick={onConfirm}>
                {confirmLabel ?? t('studio.confirm.confirm')}
              </Button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
