<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'stack' => $this->stack,
            'description' => $this->description,
            // Publicados (columna desnormalizada, mantenida por ComponentObserver).
            'components_count' => $this->components_count,
            // Todos los estados. Solo lo pide el panel de admin, para saber si
            // la categoría se puede borrar.
            'total_components' => $this->whenCounted('components', $this->total_components),
        ];
    }
}
