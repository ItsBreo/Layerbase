<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Etiqueta libre asignada por autores. Ver §7 del modelo de datos.
 */
#[Fillable(['name', 'slug'])]
class Tag extends Model
{
    /** Slug automático desde el nombre. */
    protected static function booted(): void
    {
        static::saving(function (Tag $tag): void {
            if (empty($tag->slug) && ! empty($tag->name)) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }

    /** @return BelongsToMany<Component, $this> */
    public function components(): BelongsToMany
    {
        return $this->belongsToMany(Component::class);
    }

    /**
     * Recalcula `components_count` de las etiquetas indicadas.
     *
     * Solo cuenta componentes PUBLICADOS, por el mismo motivo que en Category.
     * Este contador no es decorativo: el autocompletado público de `/tags`
     * ordena por él, así que mientras valía 0 en todas las filas, las
     * sugerencias salían sin ningún orden real.
     *
     * @param  array<int, int|null>  $ids
     */
    public static function recount(array $ids): void
    {
        $ids = array_values(array_unique(array_filter($ids)));

        if ($ids === []) {
            return;
        }

        static::query()->whereIn('id', $ids)->update([
            'components_count' => DB::raw(
                '(select count(*) from component_tag
                    join components on components.id = component_tag.component_id
                  where component_tag.tag_id = tags.id
                    and components.status = \'published\'
                    and components.deleted_at is null)'
            ),
        ]);
    }

    /** Etiquetas sin ningún componente asociado (ni siquiera sin publicar). */
    public function scopeOrphan($query)
    {
        return $query->whereDoesntHave('components');
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
