<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
