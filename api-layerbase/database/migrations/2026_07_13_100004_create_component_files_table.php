<?php

use App\Enums\ComponentFileType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Archivos asociados a un componente (source, readme, preview). El código
 * fuente nunca se sirve directo: se entrega vía URL firmada temporal.
 * Ver documents/ComponentHub_Modelo_Datos.md (§4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('component_files', function (Blueprint $table) {
            $table->id();
            // cascadeOnDelete: al borrar (hard) un componente se van sus files.
            // El soft delete del componente NO dispara esto (no hay hard delete).
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ComponentFileType::values())->index();
            // Disco de almacenamiento (local en dev, s3/r2 en prod).
            $table->string('disk', 20)->default('s3');
            // Ruta relativa dentro del disco (nunca una URL pública).
            $table->string('path', 500);
            $table->string('filename', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('component_files');
    }
};
