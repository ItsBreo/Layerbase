<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Etiquetas libres que los autores asignan a sus componentes. Permiten
 * búsquedas cruzadas más específicas que las categorías.
 * Ver documents/ComponentHub_Modelo_Datos.md (§7).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->index();
            $table->string('slug', 55)->unique();
            // Desnormalizado, mantenido por Observer.
            $table->unsignedInteger('components_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tags');
    }
};
