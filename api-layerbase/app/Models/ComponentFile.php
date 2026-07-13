<?php

namespace App\Models;

use App\Enums\ComponentFileType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Archivo físico de un componente (source/readme/preview). La ruta se guarda
 * relativa al disco; la URL de acceso se genera bajo demanda y, para el
 * source, siempre firmada y temporal. Ver §4 del modelo de datos.
 */
#[Fillable(['type', 'disk', 'path', 'filename', 'mime_type', 'size_bytes'])]
class ComponentFile extends Model
{
    protected function casts(): array
    {
        return [
            'type' => ComponentFileType::class,
            'size_bytes' => 'integer',
        ];
    }

    /** @return BelongsTo<Component, $this> */
    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }

    /**
     * URL firmada de descarga que expira en `$minutes` minutos (por defecto, el
     * TTL de config/components.php). En S3/R2 devuelve una presigned URL; en el
     * disco `local` de desarrollo, que no soporta URLs temporales, recae en una
     * URL firmada de Laravel equivalente para no romper el flujo.
     */
    public function temporaryUrl(?int $minutes = null): string
    {
        $minutes ??= (int) config('components.download_url_ttl', 5);
        $expiresAt = now()->addMinutes($minutes);
        $disk = Storage::disk($this->disk);

        try {
            return $disk->temporaryUrl($this->path, $expiresAt, [
                'ResponseContentDisposition' => 'attachment; filename="'.$this->filename.'"',
            ]);
        } catch (\RuntimeException) {
            // Disco local (dev): sin presigned URLs. Devolvemos la URL pública
            // si el disco la soporta; si no, la ruta relativa.
            return method_exists($disk, 'url') ? $disk->url($this->path) : $this->path;
        }
    }
}
