<?php

namespace App\Enums;

/**
 * Rol global de un usuario en la plataforma.
 *
 * Se modela como enum respaldado por string para tener seguridad de tipos en
 * todo el dominio y un único sitio de verdad que coincide con el ENUM de la
 * columna `users.role` (ver documents/ComponentHub_Modelo_Datos.md).
 */
enum UserRole: string
{
    case User = 'user';
    case Author = 'author';
    case Admin = 'admin';

    /** Valores válidos como array de strings (útil para reglas de validación). */
    public static function values(): array
    {
        return array_map(fn (self $role) => $role->value, self::cases());
    }
}
