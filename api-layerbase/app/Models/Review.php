<?php

namespace App\Models;

use App\Observers\ReviewObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Valoración de un componente. Ver §9 del modelo de datos.
 *
 * `reported` y `report_reason` quedan FUERA de $fillable: los escribe el flujo
 * de reporte, nunca el cuerpo de la petición con la que alguien crea o edita su
 * propia valoración. Si fueran mass-assignable, cualquiera podría marcar la suya
 * como reportada — o peor, limpiar el reporte de otra.
 */
#[Fillable(['rating', 'body'])]
#[ObservedBy(ReviewObserver::class)]
class Review extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'reported' => 'boolean',
        ];
    }

    /** @return BelongsTo<Component, $this> */
    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Valoraciones visibles públicamente (las reportadas se ocultan). */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('reported', false);
    }

    /** Marca la valoración como reportada, con su motivo. */
    public function report(string $reason): void
    {
        $this->reported = true;
        $this->report_reason = $reason;
        $this->save();
    }
}
