<?php

namespace App\Observers;

use App\Models\Category;
use App\Models\Component;
use App\Models\Tag;

/**
 * Mantiene al día los contadores desnormalizados del catálogo.
 *
 * `categories.components_count` y `tags.components_count` existían desde la
 * primera migración pero **nadie los escribía**: valían 0 en todas las filas.
 * El autocompletado público de `/tags` ordena por ese número, así que las
 * sugerencias salían sin orden real.
 *
 * Los contadores cuentan solo componentes PUBLICADOS, con lo que cambian
 * también al aprobar, despublicar o volver a borrador — no solo al crear o
 * borrar. Por eso se engancha `saved` y no `created`: cubre cualquier cambio de
 * estado sin tener que enumerarlos.
 *
 * Las etiquetas se recalculan además desde `ComponentController::syncTags`,
 * porque `sync()` toca la tabla pivote sin disparar eventos del modelo.
 */
class ComponentObserver
{
    public function saved(Component $component): void
    {
        $this->recount($component);
    }

    public function deleted(Component $component): void
    {
        $this->recount($component);
    }

    public function restored(Component $component): void
    {
        $this->recount($component);
    }

    public function forceDeleted(Component $component): void
    {
        $this->recount($component);
    }

    /**
     * Recalcula la categoría actual y —si el componente se movió de una a
     * otra— también la anterior, que se queda con un componente menos.
     */
    private function recount(Component $component): void
    {
        Category::recount([
            $component->category_id,
            $component->getOriginal('category_id'),
        ]);

        Tag::recount($component->tags()->pluck('tags.id')->all());
    }
}
