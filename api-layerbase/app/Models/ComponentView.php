<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Visitas de un componente en un día concreto.
 *
 * Sin timestamps: `viewed_on` YA es la fecha, y un created_at/updated_at solo
 * añadiría ruido a una tabla cuyo único propósito es contar. Ver §5 del modelo
 * de datos.
 */
#[Fillable(['component_id', 'viewed_on', 'count'])]
class ComponentView extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'viewed_on' => 'date',
            'count' => 'integer',
        ];
    }

    /** @return BelongsTo<Component, $this> */
    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }
}
