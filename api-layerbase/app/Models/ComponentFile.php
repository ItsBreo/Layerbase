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

    /**
     * Recorta el esquema y el host de una URL que sirve ESTA misma aplicación,
     * dejando solo ruta + query.
     *
     * Es imprescindible en Docker. El SPA llega por el proxy de Vite, así que
     * Laravel ve la petición con el host interno (`nginx`) y firma la URL con
     * él: el navegador recibía `http://nginx/storage/...`, un host que solo
     * existe dentro de la red de Docker y que no puede resolver. Resultado: la
     * descarga fallaba en silencio y el editor y la vista previa se quedaban
     * vacíos. Con la URL relativa, la petición sale al mismo origen del SPA y
     * el proxy la reenvía — y la firma sigue validando porque el host que ve
     * Laravel al comprobarla es el mismo con el que firmó.
     *
     * Solo se aplica a discos locales. Una presigned URL de S3/R2 apunta a otro
     * dominio y tiene que seguir siendo absoluta.
     */
    private function relativeIfServedByUs(string $url): string
    {
        if (config("filesystems.disks.{$this->disk}.driver") !== 'local') {
            return $url;
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return $url;
        }

        $query = parse_url($url, PHP_URL_QUERY);

        return $query ? "{$path}?{$query}" : $path;
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
            $url = $disk->temporaryUrl($this->path, $expiresAt, [
                'ResponseContentDisposition' => 'attachment; filename="'.$this->filename.'"',
            ]);

            return $this->relativeIfServedByUs($url);
        } catch (\Throwable $e) {
            // Un archivo PROTEGIDO no puede degradar a URL pública permanente.
            //
            // El fallback de abajo devuelve una URL sin firma y sin caducidad:
            // para el `source` de un componente de pago eso significa repartir
            // el producto saltándose la policy, y para siempre. Antes se caía
            // aquí en silencio; ahora revienta, que es lo correcto — una mala
            // configuración de disco tiene que verse, no filtrar código.
            //
            // Se dispara con discos sin URLs firmadas (p. ej. `public`). El
            // disco `local` sí las soporta gracias a `serve => true`.
            if ($this->type->isProtected()) {
                throw new \RuntimeException(
                    "El disco '{$this->disk}' no soporta URLs temporales firmadas y el archivo "
                    ."de tipo '{$this->type->value}' está protegido. Configura un disco que las "
                    .'soporte (s3/r2, o local con serve => true).',
                    previous: $e,
                );
            }

            // readme/preview son públicos por definición: aquí la URL permanente
            // es la correcta.
            try {
                return $this->relativeIfServedByUs($disk->url($this->path));
            } catch (\Throwable) {
                return '/storage/'.ltrim($this->path, '/');
            }
        }
    }
}
