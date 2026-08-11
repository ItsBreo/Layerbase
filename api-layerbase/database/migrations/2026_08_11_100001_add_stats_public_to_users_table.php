<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visibilidad del resumen de autor (componentes, descargas, valoración).
 *
 * Por defecto PRIVADO: las métricas de un autor son suyas hasta que decida
 * publicarlas. El propio usuario y los admin las ven siempre; el resto, solo si
 * `stats_public` está activo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('stats_public')->default(false)->after('stripe_onboarded');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('stats_public');
        });
    }
};
