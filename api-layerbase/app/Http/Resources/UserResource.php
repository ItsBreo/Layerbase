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
     * ¿Se trata al usuario como "el propio" aunque la petición no venga
     * autenticada?
     *
     * Registro y login devuelven el usuario recién autenticado, pero en ese
     * momento `$request->user()` todavía es null: el token acaba de emitirse y
     * no ha viajado en ninguna cabecera. Sin esta marca, la respuesta del
     * registro saldría sin email — el usuario no recibiría ni sus propios datos.
     */
    protected bool $asSelf = false;

    /** Instancia para el propio usuario en un contexto aún no autenticado. */
    public static function forSelf(User $user): static
    {
        $resource = new static($user);
        $resource->asSelf = true;

        return $resource;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isSelf = $this->asSelf || (bool) $viewer?->is($this->resource);
        $canSeeModeration = $viewer?->isAdmin() || $isSelf;
        // El resumen es privado salvo que su dueño lo publique; él y los admin
        // lo ven siempre.
        $canSeeStats = $canSeeModeration || $this->stats_public;

        return [
            'id' => $this->id,
            'name' => $this->name,
            // El email NO es público: este recurso se serializa como `author`
            // en cada tarjeta del listado de componentes, que es un endpoint
            // abierto a invitados. Sin esta condición, un `GET /components`
            // sin autenticar devolvía el correo de todos los autores.
            'email' => $this->when($canSeeModeration, fn () => $this->email),
            'role' => $this->role->value,
            'avatar_url' => $this->avatar_url,
            'bio' => $this->bio,
            'website' => $this->website,
            'github_username' => $this->github_username,
            'twitter_username' => $this->twitter_username,
            // Estado de cobros y de moderación: interno. A un visitante no le
            // incumbe si un autor tiene Stripe configurado ni si está suspendido.
            'stripe_onboarded' => $this->when($canSeeModeration, fn () => (bool) $this->stripe_onboarded),
            'banned' => $this->when($canSeeModeration, fn () => (bool) $this->banned),
            'ban_reason' => $this->when($canSeeModeration, $this->ban_reason),
            'email_verified_at' => $this->when($canSeeModeration, fn () => $this->email_verified_at),
            'created_at' => $this->created_at,
            // Solo presente si quien consulta hizo withCount('components')
            // (hoy, el listado de usuarios del panel de admin).
            'components_count' => $this->whenCounted('components'),

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
