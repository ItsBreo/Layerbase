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
     * La URL se almacena RELATIVA (`/storage/...`) para que funcione detrás del
     * proxy de Vite en desarrollo y sin depender del puerto de APP_URL.
     */
    public function store(User $user, UploadedFile $file): string
    {
        $disk = $this->disk();

        $this->deletePrevious($user);

        $path = $file->store("avatars/{$user->id}", $disk);
        $url = Storage::disk($disk)->url($path);

        $user->avatar_url = parse_url($url, PHP_URL_PATH) ?: $url;
        $user->save();

        return $user->avatar_url;
    }

    /**
     * Borra del disco el avatar anterior. Solo actúa sobre ficheros que hemos
     * subido nosotros: si `avatar_url` apunta a un dominio externo (avatar de
     * GitHub/Google tras el login OAuth) no hay nada que borrar.
     */
    private function deletePrevious(User $user): void
    {
        $previous = $user->avatar_url;

        if ($previous === null || ! str_contains($previous, '/avatars/')) {
            return;
        }

        $disk = $this->disk();
        $path = ltrim((string) parse_url($previous, PHP_URL_PATH), '/');
        // La URL pública lleva el prefijo del symlink (`storage/`), que no forma
        // parte de la ruta dentro del disco.
        $path = preg_replace('#^storage/#', '', $path) ?? $path;

        if (Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->delete($path);
        }
    }

    private function disk(): string
    {
        return config('profile.avatar_disk', 'public');
    }
}
