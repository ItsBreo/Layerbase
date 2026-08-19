<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Categoría de clasificación de componentes. Gestionadas solo por admin.
 * `stack` puede ser 'all' (transversal), por eso no se castea al enum Stack.
 * Ver documents/ComponentHub_Modelo_Datos.md (§6).
 */
#[Fillable(['name', 'slug', 'stack', 'description'])]
class Category extends Model
{
    /**
     * Genera el slug automáticamente desde el nombre si no se aporta uno.
     */
    protected static function booted(): void
    {
        static::saving(function (Category $category): void {
            if (empty($category->slug) && ! empty($category->name)) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    /** @return HasMany<Component, $this> */
    public function components(): HasMany
    {
        return $this->hasMany(Component::class);
    }

    /**
     * Recalcula `components_count` de las categorías indicadas.
     *
     * Cuenta solo los PUBLICADOS: es un número que se enseña en un catálogo
     * público, y contar borradores prometería componentes que nadie puede ver.
     *
     * Se RECALCULA en vez de sumar/restar deltas. Un delta habría que ajustarlo
     * en cada creación, borrado, restauración, cambio de categoría y cambio de
     * estado; basta con olvidar uno para que el contador quede desviado para
     * siempre. Recalcular es una query y siempre da el número correcto.
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
                '(select count(*) from components
                  where components.category_id = categories.id
                    and components.status = \'published\'
                    and components.deleted_at is null)'
            ),
        ]);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
