<?php

use App\Models\Component;
use Illuminate\Database\Migrations\Migration;

/**
 * Recalcula la valoración de todos los componentes a partir de las reales.
 *
 * El seeder de demo inventaba `rating_avg` y `rating_count`, y desde que
 * existen las valoraciones esas cifras son visiblemente falsas: la tarjeta
 * enseñaba 4,2 estrellas y la ficha decía "nadie ha valorado este componente".
 *
 * Los que no tengan valoraciones reales quedan en `rating_count = 0` y
 * `rating_avg = NULL`. NULL y no un valor por defecto: cualquier número ahí
 * sería una nota inventada, que es justo lo que se está quitando, y la
 * interfaz ya sabe mostrar "sin valoraciones" cuando no hay nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Component::recountRatings(Component::withTrashed()->pluck('id')->all());
    }

    public function down(): void
    {
        // No se revierte: restaurar cifras inventadas no tiene sentido.
    }
};
