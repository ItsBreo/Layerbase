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
     * ¿Se adjunta el resumen de autor? Está APAGADO por defecto a propósito:
     * calcularlo cuesta una query, y este recurso se serializa una vez por
     * tarjeta en los listados de componentes. Solo lo encienden los endpoints
     * de perfil, vía `withStats()`.
     */
    protected bool $withStats = false;

    /** Instancia que sí incluye el resumen de autor. */
    public static function withStats(User $user): static
    {
        $resource = new static($user);
        $resource->withStats = true;

        return $resource;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isSelf = (bool) $viewer?->is($this->resource);
        $canSeeModeration = $viewer?->isAdmin() || $isSelf;
        // El resumen es privado salvo que su dueño lo publique; él y los admin
        // lo ven siempre.
        $canSeeStats = $canSeeModeration || $this->stats_public;

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

            // Ajuste del propio usuario; a terceros no les incumbe.
            'stats_public' => $this->when($canSeeModeration, (bool) $this->stats_public),
            // Las cuentas de OAuth no tienen contraseña local: el frontend usa
            // esto para no ofrecerles el formulario de cambio.
            'has_password' => $this->when($isSelf, fn () => $this->hasPassword()),
            'stats' => $this->when(
                $this->withStats && $canSeeStats,
                fn () => $this->authorStats(),
            ),
        ];
    }
}
