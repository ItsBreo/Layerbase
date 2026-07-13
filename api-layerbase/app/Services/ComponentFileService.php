<?php

namespace App\Services;

use App\Enums\ComponentFileType;
use App\Models\Component;
use App\Models\ComponentFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Encapsula el almacenamiento físico de los archivos de un componente y su
 * registro en `component_files`. Mantiene el invariante "un archivo por tipo":
 * subir un tipo que ya existe reemplaza (y borra del disco) el anterior.
 */
class ComponentFileService
{
    /**
     * Sube (o reemplaza) el archivo de un tipo para el componente dado.
     * Todo el objeto físico + fila queda en una transacción: si algo falla, no
     * quedan archivos huérfanos referenciados en BD.
     */
    public function store(Component $component, UploadedFile $file, ComponentFileType $type): ComponentFile
    {
        $disk = $this->disk();
        // Carpeta por componente; el source va aparte para no listarse por error.
        $directory = "components/{$component->id}/{$type->value}";

        return DB::transaction(function () use ($component, $file, $type, $disk, $directory) {
            // Reemplazo: elimina el archivo previo del mismo tipo (disco + fila).
            $existing = $component->files()->where('type', $type)->first();
            if ($existing !== null) {
                Storage::disk($existing->disk)->delete($existing->path);
                $existing->delete();
            }

            // Nombre en disco aleatorio (evita colisiones y adivinar rutas);
            // el nombre original se guarda aparte para la descarga.
            $path = $file->store($directory, $disk);

            return $component->files()->create([
                'type' => $type,
                'disk' => $disk,
                'path' => $path,
                'filename' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size_bytes' => $file->getSize() ?? 0,
            ]);
        });
    }

    /** Borra el archivo del disco y su fila. */
    public function delete(ComponentFile $file): void
    {
        DB::transaction(function () use ($file): void {
            Storage::disk($file->disk)->delete($file->path);
            $file->delete();
        });
    }

    /**
     * Disco destino: configurable por entorno (local en dev, s3/r2 en prod).
     * Cae al disco por defecto del sistema de archivos si no se define.
     */
    private function disk(): string
    {
        return config('components.files_disk', config('filesystems.default'));
    }
}
