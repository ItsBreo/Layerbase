<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Motivo del rechazo en la moderación.
 *
 * Sin esto, `rejected` es un callejón sin salida informativo: el autor ve que
 * le han tumbado el componente pero no qué corregir antes de reenviarlo. Se
 * guarda en la propia fila (y no en una tabla de histórico) porque solo importa
 * el último rechazo: al reenviar a revisión se limpia.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('components', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('published_at');
        });
    }

    public function down(): void
    {
        Schema::table('components', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });
    }
};
