<?php

namespace App\Http\Resources;

use App\Enums\ComponentFileType;
use App\Models\Component;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representación pública de un componente (allow-list).
 *
 * Regla de oro: el código fuente NUNCA se expone aquí. Solo se listan los
 * archivos no protegidos (readme/preview) y se indica si existe source más un
 * flag de si el espectador puede descargarlo, para que el frontend decida si
 * mostrar el botón de descarga. La descarga real va por endpoint dedicado.
 *
 * @mixin Component
 */
class ComponentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'stack' => $this->stack,
            'price' => $this->price,
            'is_free' => $this->isFree(),
            'status' => $this->status,
            'downloads' => $this->downloads,
            'rating_avg' => $this->rating_avg,
            'rating_count' => $this->rating_count,
            'thumbnail_url' => $this->thumbnail_url,
            // Portada resuelta (imagen del autor > thumbnail). Solo si los
            // archivos están cargados; si es null el frontend decide entre
            // render en vivo y placeholder.
            'preview_url' => $this->when(
                $this->relationLoaded('files'),
                fn () => $this->previewImageUrl(),
            ),
            'published_at' => $this->published_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Relaciones: solo si se han cargado con eager loading (evita N+1
            // y no fuerza queries cuando el endpoint no las necesita).
            'author' => new UserResource($this->whenLoaded('author')),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),

            // Archivos: se exponen readme/preview; el source se omite del
            // listado y se refleja mediante flags.
            'files' => $this->when(
                $this->relationLoaded('files'),
                fn () => ComponentFileResource::collection(
                    $this->files->reject(fn ($file) => $file->type->isProtected())
                ),
            ),
            'has_source' => $this->when(
                $this->relationLoaded('files'),
                fn () => $this->files->contains(
                    fn ($file) => $file->type === ComponentFileType::Source
                ),
            ),
            'can_download_source' => $this->userCanAccessSource($viewer),
        ];
    }
}
