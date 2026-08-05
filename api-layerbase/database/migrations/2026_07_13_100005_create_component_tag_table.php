<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivote muchos-a-muchos entre componentes y tags. La PK compuesta impide
 * duplicar la misma etiqueta en un componente. Ver §8 del modelo de datos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('component_tag', function (Blueprint $table) {
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['component_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('component_tag');
    }
};
