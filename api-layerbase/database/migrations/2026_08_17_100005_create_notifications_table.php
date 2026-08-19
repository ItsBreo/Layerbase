<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notificaciones in-app. Tabla estándar de Laravel (§12 del modelo de datos).
 *
 * PK en UUID y no autoincremental: es lo que espera el trait `Notifiable`, y
 * además evita que el id revele cuántas notificaciones ha mandado la
 * plataforma.
 *
 * `data` en JSON en vez de columnas fijas porque cada tipo lleva su propio
 * contenido (una aprobación lleva el slug del componente; un rechazo, además,
 * el motivo). Con columnas habría que migrar la tabla cada vez que se añade un
 * tipo nuevo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // El listado siempre pide "las no leídas de este usuario".
            $table->index('read_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
