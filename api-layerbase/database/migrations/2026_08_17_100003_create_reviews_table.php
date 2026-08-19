<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Valoraciones de componentes. Ver documents/ComponentHub_Modelo_Datos.md (§9).
 *
 * La clave única (user_id, component_id) es la regla de negocio principal: una
 * persona opina UNA vez sobre cada componente. Sin ella, cualquiera podría
 * inflar o hundir la nota repitiendo valoraciones, y la media dejaría de
 * significar nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();

            // cascadeOnDelete: las valoraciones de un componente borrado
            // definitivamente no significan nada por sí solas.
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->unsignedTinyInteger('rating');
            $table->text('body');

            // Moderación: un tercero puede reportar una valoración abusiva.
            $table->boolean('reported')->default(false);
            $table->text('report_reason')->nullable();

            $table->timestamps();
            // Soft delete: un admin retira una valoración sin perder el rastro.
            $table->softDeletes();

            $table->unique(['user_id', 'component_id']);
            $table->index('component_id');
            $table->index('reported');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
