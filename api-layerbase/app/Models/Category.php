<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
