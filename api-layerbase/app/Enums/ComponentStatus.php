<?php

namespace App\Enums;

/**
 * Estado del ciclo de vida de un componente.
 *
 * Se modela como enum (y no como string suelto) para dar seguridad de tipos a
 * la máquina de estados de moderación y centralizar en un único sitio qué
 * transiciones son legales. Los valores coinciden con el ENUM de
 * `components.status`. Ver documents/ComponentHub_Modelo_Datos.md.
 *
 * Ciclo permitido:
 *   draft ─────────► pending_review ──► published ──► unpublished
 *     ▲                    │                                │
 *     └──── rejected ◄─────┘                                │
 *     └─────────────────────────────────────────(reenvío)──┘
 */
enum ComponentStatus: string
{
    case Draft = 'draft';
    case PendingReview = 'pending_review';
    case Published = 'published';
    case Rejected = 'rejected';
    case Unpublished = 'unpublished';

    /** Valores válidos como array de strings (útil para reglas de validación). */
    public static function values(): array
    {
        return array_map(fn (self $status) => $status->value, self::cases());
    }

    /**
     * Transiciones legales de la máquina de estados. Fuente única de verdad:
     * los controllers/servicios consultan aquí en vez de replicar la lógica.
     *
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [self::PendingReview],
            self::PendingReview => [self::Published, self::Rejected],
            self::Published => [self::Unpublished],
            // Tras un rechazo o una despublicación el autor vuelve a borrador
            // para corregir y reenviar.
            self::Rejected => [self::Draft],
            self::Unpublished => [self::Draft],
        };
    }

    /** ¿Es legal pasar de este estado al indicado? */
    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), strict: true);
    }

    /**
     * ¿El componente es editable en este estado? No se puede editar mientras
     * está publicado ni en revisión: hay que despublicarlo/esperar antes.
     */
    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Rejected], strict: true);
    }
}
