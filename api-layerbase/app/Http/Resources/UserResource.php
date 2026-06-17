<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representación pública de un usuario.
 *
 * Lista explícita (allow-list): nunca se serializan password, tokens, IDs de
 * OAuth ni datos internos de Stripe. Los campos de moderación (`ban_reason`)
 * solo se exponen al propio usuario o a un admin.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $canSeeModeration = $viewer?->isAdmin() || $viewer?->is($this->resource);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'avatar_url' => $this->avatar_url,
            'bio' => $this->bio,
            'website' => $this->website,
            'github_username' => $this->github_username,
            'twitter_username' => $this->twitter_username,
            'stripe_onboarded' => $this->stripe_onboarded,
            'banned' => $this->banned,
            'ban_reason' => $this->when($canSeeModeration, $this->ban_reason),
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
        ];
    }
}
