<?php

namespace App\Http\Resources;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Valoración tal y como se expone públicamente.
 *
 * `report_reason` solo lo ve un admin: es información de moderación, y quien
 * escribió la valoración no tiene por qué saber quién ni por qué la reportó.
 *
 * @mixin Review
 */
class ReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();

        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'body' => $this->body,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'author' => new UserResource($this->whenLoaded('author')),
            // Permite al frontend enseñar "editar" sin comparar ids a mano.
            'is_mine' => $viewer !== null && $viewer->id === $this->user_id,
            'reported' => $this->when((bool) $viewer?->isAdmin(), fn () => (bool) $this->reported),
            'report_reason' => $this->when((bool) $viewer?->isAdmin(), fn () => $this->report_reason),
        ];
    }
}
