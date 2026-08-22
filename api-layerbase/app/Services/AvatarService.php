<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Almacenamiento de la foto de perfil.
 *
 * A diferencia de los archivos de componente (fila en `component_files` + URL
 * firmada temporal), el avatar es público y se guarda como una URL permanente
 * en `users.avatar_url`. Por eso vive en el disco público y no lleva registro
 * propio en base de datos.
 */
class AvatarService
{
    /**
     * Guarda el avatar y devuelve su URL, borrando el anterior si lo había.
     */
    public function store(User $user, UploadedFile $file): string
    {
        $disk = $this->disk();

        $this->deletePrevious($user);

        $path = $file->store("avatars/{$user->id}", $disk);
        $url = Storage::disk($disk)->url($path);

        $user->avatar_url = $this->relativeIfServedByUs($url, $disk);
        $user->save();

        return $user->avatar_url;
    }

    /**
     * En disco local la URL se guarda RELATIVA (`/storage/...`): así funciona
     * detrás del proxy de Vite y no depende del puerto de APP_URL.
     *
     * En un disco remoto (S3/R2) hay que dejarla ABSOLUTA. Antes se recortaba
     * siempre a la ruta, y con R2 eso se comía el dominio del bucket: el avatar
     * quedaba apuntando a `/avatars/…` del dominio del FRONTEND, donde no hay
     * nada que servir. Misma regla que `ComponentFile::relativeIfServedByUs()`.
     */
    private function relativeIfServedByUs(string $url, string $disk): string
    {
        if (config("filesystems.disks.{$disk}.driver") !== 'local') {
            return $url;
        }

        return parse_url($url, PHP_URL_PATH) ?: $url;
    }

    /**
     * Borra del disco el avatar anterior. Solo actúa sobre ficheros que hemos
     * subido nosotros: si `avatar_url` apunta a un dominio externo (avatar de
     * GitHub/Google tras el login OAuth) no hay nada que borrar.
     */
    private function deletePrevious(User $user): void
    {
        $previous = $user->avatar_url;

        if ($previous === null) {
            return;
        }

        $path = $this->pathWithinDisk($previous);

        if ($path === null) {
            return;
        }

        $disk = $this->disk();

        if (Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->delete($path);
        }
    }

    /**
     * Extrae la ruta dentro del disco a partir de la URL guardada, o null si la
     * URL no es de un avatar nuestro (los de GitHub/Google tras el login OAuth
     * apuntan a un dominio externo y no hay nada que borrar).
     *
     * Se busca el patrón `avatars/{id}/…` en vez de recortar la URL, porque la
     * forma de la URL cambia con el disco: relativa con prefijo `storage/` en
     * local, con el bucket por delante si R2 va en modo path-style, y sin él si
     * va por dominio propio. El patrón es el mismo en los tres casos.
     */
    private function pathWithinDisk(string $url): ?string
    {
        return preg_match('~(avatars/\d+/[^/?#]+)~', $url, $coincidencia) === 1
            ? $coincidencia[1]
            : null;
    }

    private function disk(): string
    {
        return config('profile.avatar_disk', 'public');
    }
}
