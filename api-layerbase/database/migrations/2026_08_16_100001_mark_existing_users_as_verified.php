<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Da por verificadas las cuentas anteriores a la verificación de email.
 *
 * Al introducir el gate de publicación, toda cuenta sin `email_verified_at`
 * deja de poder enviar componentes a revisión. Las cuentas que ya existían se
 * crearon cuando el registro ni siquiera enviaba correo de verificación, así
 * que sin este backfill quedarían bloqueadas por algo que nunca se les pidió
 * — incluida la del administrador.
 *
 * Es una decisión consciente sobre datos ya existentes, no una comprobación de
 * identidad: se asume que las cuentas creadas antes de esta migración son
 * legítimas. En una plataforma con usuarios reales en producción habría que
 * valorar pedirles verificación en lugar de darla por buena.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // No se revierte: no hay forma de distinguir las cuentas que verificó
        // este backfill de las que se verificaron de verdad, y revertir todas
        // bloquearía a usuarios legítimos.
    }
};
