<?php

use App\Enums\Stack;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Categorías predefinidas para clasificar componentes. Solo los admin las
 * crean/editan. Ver documents/ComponentHub_Modelo_Datos.md (§6).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 110)->unique();
            // 'all' = categoría transversal a cualquier stack. Por eso el enum
            // añade un valor extra sobre los de Stack. Se indexa por el filtro.
            $table->enum('stack', [...Stack::values(), 'all'])->default('all')->index();
            $table->string('description', 255)->nullable();
            // Contador desnormalizado: se mantiene por Observer al publicar/
            // despublicar componentes, para no contar en cada listado.
            $table->unsignedInteger('components_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
