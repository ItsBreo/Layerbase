<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visitas a la ficha de un componente, AGREGADAS POR DÍA.
 *
 * Una fila por componente y día, no por visita: guardar cada visita suelta
 * haría crecer la tabla sin control y no aporta nada que no diga el agregado.
 * Ver documents/ComponentHub_Modelo_Datos.md (§5).
 *
 * La clave única (component_id, viewed_on) no es solo integridad: es lo que
 * permite resolver el incremento con un único INSERT ... ON CONFLICT, sin leer
 * antes ni arriesgar carreras entre dos visitas simultáneas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('component_views', function (Blueprint $table) {
            $table->id();

            // cascadeOnDelete: las visitas de un componente borrado no
            // significan nada por sí solas.
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();

            // DATE y no timestamp: la unidad de agregación es el día.
            $table->date('viewed_on');
            $table->unsignedInteger('count')->default(1);

            $table->unique(['component_id', 'viewed_on']);
            // Para las consultas por rango de fechas del panel de métricas.
            $table->index('viewed_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('component_views');
    }
};
