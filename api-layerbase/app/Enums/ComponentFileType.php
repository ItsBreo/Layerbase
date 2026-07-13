<?php

namespace App\Enums;

/**
 * Tipo de archivo asociado a un componente.
 *
 * - source:  código fuente. Protegido: solo autor/comprador/gratuito.
 * - readme:  documentación. Se puede exponer públicamente.
 * - preview: imagen cruda de previsualización (antes de generar el thumbnail).
 *
 * Coincide con el ENUM de `component_files.type`. Un componente tiene como
 * máximo un archivo de cada tipo. Ver documents/ComponentHub_Modelo_Datos.md.
 */
enum ComponentFileType: string
{
    case Source = 'source';
    case Readme = 'readme';
    case Preview = 'preview';

    /** Valores válidos como array de strings (útil para reglas de validación). */
    public static function values(): array
    {
        return array_map(fn (self $type) => $type->value, self::cases());
    }

    /**
     * ¿El acceso a este tipo de archivo está restringido por compra/propiedad?
     * Solo el código fuente lo está; readme y preview son públicos.
     */
    public function isProtected(): bool
    {
        return $this === self::Source;
    }
}
