<?php

namespace App\Console\Commands;

use App\Models\Component;
use Illuminate\Console\Command;

/**
 * Borra definitivamente los componentes que llevan soft-deleted más de N días.
 *
 * El soft delete existe para poder restaurar y para no perder el rastro de algo
 * que alguien compró, pero nada lo cerraba nunca: los componentes borrados —y
 * sus archivos— se quedaban ahí para siempre. En S3/R2 eso es una factura
 * mensual por objetos que ya no referencia nadie.
 *
 * El borrado definitivo dispara el evento `forceDeleted` de Component, que es
 * quien limpia los archivos del disco (ver `Component::purgeFiles()`).
 */
class PurgeDeletedComponents extends Command
{
    protected $signature = 'components:purge-deleted
                            {--days=30 : Días que debe llevar borrado un componente para purgarlo}
                            {--dry-run : Muestra qué se purgaría sin borrar nada}';

    protected $description = 'Borra definitivamente los componentes soft-deleted antiguos y sus archivos';

    public function handle(): int
    {
        $days = max(0, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        $components = Component::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->get();

        if ($components->isEmpty()) {
            $this->info("No hay componentes borrados hace más de {$days} días.");

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->warn("Se purgarían {$components->count()} componentes (dry-run, no se borra nada):");
            foreach ($components as $component) {
                $this->line("  #{$component->id} {$component->slug} (borrado {$component->deleted_at})");
            }

            return self::SUCCESS;
        }

        foreach ($components as $component) {
            // forceDelete dispara `forceDeleted`, que borra los archivos.
            $component->forceDelete();
            $this->line("Purgado #{$component->id} {$component->slug}");
        }

        $this->info("Purgados {$components->count()} componentes y sus archivos.");

        return self::SUCCESS;
    }
}
