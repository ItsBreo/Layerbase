<?php

namespace App\Enums;

/**
 * Tecnología (framework) sobre la que está construido un componente.
 *
 * Enum respaldado por string: es la única fuente de verdad que coincide con el
 * ENUM de la columna `components.stack` y con `categories.stack` (que además
 * admite el pseudo-valor transversal, ver Category). Ver
 * documents/ComponentHub_Modelo_Datos.md.
 */
enum Stack: string
{
    case React = 'react';
    case Angular = 'angular';
    case Vanilla = 'vanilla';

    /** Valores válidos como array de strings (útil para reglas de validación). */
    public static function values(): array
    {
        return array_map(fn (self $stack) => $stack->value, self::cases());
    }
}
