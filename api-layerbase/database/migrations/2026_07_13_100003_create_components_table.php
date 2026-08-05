<?php

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Entidad principal del marketplace: un componente de UI publicado por un
 * autor. Ver documents/ComponentHub_Modelo_Datos.md (§3).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('components', function (Blueprint $table) {
            $table->id();

            // Autor propietario. restrictOnDelete: no se borra un user con
            // componentes de golpe; el soft delete de users preserva historial.
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            // Categoría obligatoria. restrictOnDelete: no se borra una categoría
            // con componentes vivos.
            $table->foreignId('category_id')->constrained()->restrictOnDelete();

            $table->string('title', 150);
            $table->string('slug', 160)->unique();
            $table->text('description');
            $table->enum('stack', Stack::values());
            // Precio en euros. 0.00 = gratuito. DECIMAL evita errores de coma
            // flotante en dinero.
            $table->decimal('price', 8, 2)->default(0);
            $table->enum('status', ComponentStatus::values())
                ->default(ComponentStatus::Draft->value);

            // Contadores/medias desnormalizados: se leen en cada listado, así
            // que se mantienen precalculados por Observers en vez de agregarlos.
            $table->unsignedBigInteger('downloads')->default(0);
            $table->decimal('rating_avg', 3, 2)->nullable();
            $table->unsignedInteger('rating_count')->default(0);

            $table->string('thumbnail_url', 500)->nullable();
            // Fecha en que se aprobó y publicó (null mientras no esté publicado).
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices de los filtros/orden del listado público (Módulo 3).
            $table->index('stack');
            $table->index('status');
            $table->index('price');
            $table->index('rating_avg');
            $table->index('downloads');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('components');
    }
};
