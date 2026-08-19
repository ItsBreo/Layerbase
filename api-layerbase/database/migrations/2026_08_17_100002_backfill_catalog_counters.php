<?php

use App\Models\Category;
use App\Models\Tag;
use Illuminate\Database\Migrations\Migration;

/**
 * Pone al día `components_count` de categorías y etiquetas.
 *
 * Las dos columnas existían desde la primera migración pero nadie las escribía:
 * valían 0 en todas las filas. Ahora las mantiene `ComponentObserver`, pero eso
 * solo actúa sobre cambios FUTUROS — los datos que ya estaban seguirían a cero
 * sin este recuento inicial.
 *
 * No es un dato inventado: se calcula contando los componentes publicados que
 * ya hay, exactamente igual que hará el observer a partir de ahora.
 */
return new class extends Migration
{
    public function up(): void
    {
        Category::recount(Category::query()->pluck('id')->all());
        Tag::recount(Tag::query()->pluck('id')->all());
    }

    public function down(): void
    {
        // No se revierte: volver a poner ceros solo restauraría el bug.
    }
};
