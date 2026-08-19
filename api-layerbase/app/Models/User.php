<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Campos mass-assignable. Deliberadamente se EXCLUYEN `role`, `banned`,
 * `ban_reason` y los `stripe_*`: son privilegios que solo se asignan desde
 * código de confianza (admin/observers/webhooks), nunca desde input del usuario.
 * Así evitamos escalada de privilegios por mass assignment.
 */
#[Fillable([
    'name',
    'email',
    'password',
    'avatar_url',
    'bio',
    'website',
    'github_username',
    'twitter_username',
    'github_oauth_id',
    'google_oauth_id',
    // Preferencia del propio usuario, no un privilegio: decide si su resumen
    // de autor es visible para terceros.
    'stats_public',
])]
#[Hidden(['password', 'remember_token', 'github_oauth_id', 'google_oauth_id'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * Valores por defecto a nivel de modelo. Garantizan que una instancia
     * recién creada ya tenga rol y flags sin depender del default de la BD
     * (que no se refleja en el objeto hasta refrescarlo).
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => UserRole::User->value,
        'banned' => false,
        'stripe_onboarded' => false,
        // El resumen de autor nace privado; publicarlo es una decisión activa.
        'stats_public' => false,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'banned' => 'boolean',
            'stripe_onboarded' => 'boolean',
            'stats_public' => 'boolean',
        ];
    }

    /** @return HasMany<Component, $this> Componentes publicados por el usuario. */
    public function components(): HasMany
    {
        return $this->hasMany(Component::class);
    }

    /** ¿El usuario tiene el rol indicado? */
    public function hasRole(UserRole $role): bool
    {
        return $this->role === $role;
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin);
    }

    public function isAuthor(): bool
    {
        // Los admin también pueden actuar como autores.
        return $this->hasRole(UserRole::Author) || $this->isAdmin();
    }

    /**
     * ¿Tiene contraseña local? Las cuentas creadas por OAuth no la tienen, así
     * que para ellas no aplica el cambio de contraseña.
     */
    public function hasPassword(): bool
    {
        return $this->password !== null;
    }

    /**
     * Da el email por verificado al entrar, si no lo estaba ya.
     *
     * Es una decisión de producto tomada a conciencia: mientras no haya un
     * dominio propio desde el que mandar correo, exigir verificación real
     * dejaría la plataforma inutilizable (publicar la exige), así que la
     * verificación por enlace queda desactivada de hecho.
     *
     * LO QUE ESTO CUESTA: `email_verified_at` deja de demostrar que el correo
     * sea de quien lo registró. Solo dice "esta cuenta se ha usado". Nada que
     * dependa de esa garantía puede apoyarse en este campo — y en particular
     * `SocialAuthController::upsertUser()` ya NO vincula identidades de
     * Google/GitHub por email, que era lo único que lo hacía.
     *
     * La maquinaria de verificación (endpoints, notificación, el requisito en
     * `submit`) se deja en su sitio: volver a activarla es quitar estas
     * llamadas, no reescribir el flujo.
     */
    public function markEmailAsVerifiedOnSignIn(): void
    {
        if (! $this->hasVerifiedEmail()) {
            $this->markEmailAsVerified();
        }
    }

    /**
     * Administradores ACTIVOS. Los suspendidos no cuentan: no pueden entrar, así
     * que notificarles sería mandar avisos a un buzón que nadie abre.
     *
     * @param  Builder<static>  $query
     */
    public function scopeAdmins($query)
    {
        return $query->where('role', UserRole::Admin)->where('banned', false);
    }

    /**
     * ¿Hay algún OTRO administrador activo además del indicado?
     *
     * Lo usa `ComponentPolicy::moderate` para decidir si exigir revisión
     * independiente: la regla "nadie aprueba su propio componente" solo tiene
     * sentido si queda alguien más que pueda aprobarlo. Los suspendidos no
     * cuentan — no pueden entrar, así que no pueden revisar nada.
     */
    public static function hasOtherActiveAdmins(self $except): bool
    {
        return static::query()
            ->where('role', UserRole::Admin)
            ->where('banned', false)
            ->whereKeyNot($except->getKey())
            ->exists();
    }

    /*
     * Acciones de administración. `role`, `banned` y `ban_reason` están fuera
     * de $fillable a propósito (son privilegios), así que se asignan por
     * propiedad directa desde este código de confianza — nunca vía update().
     */

    /**
     * Suspende la cuenta y revoca TODOS sus tokens.
     *
     * El middleware `EnsureAccountIsActive` ya corta al baneado en su siguiente
     * petición, pero eso deja viva la sesión hasta que la usa. Borrar los
     * tokens aquí hace que el baneo surta efecto en el acto, que es lo que se
     * espera de una suspensión.
     */
    public function ban(string $reason): void
    {
        $this->banned = true;
        $this->ban_reason = $reason;
        $this->save();

        $this->tokens()->delete();
    }

    /** Reactiva la cuenta. Tendrá que volver a iniciar sesión. */
    public function unban(): void
    {
        $this->banned = false;
        $this->ban_reason = null;
        $this->save();
    }

    /** Cambia el rol global. La comprobación de a quién se le puede cambiar
     *  vive en el controlador (no se puede uno cambiar el suyo). */
    public function changeRole(UserRole $role): void
    {
        $this->role = $role;
        $this->save();
    }

    /**
     * Resumen de autor, calculado sobre los componentes PUBLICADOS.
     *
     * Es una agregación en una sola query, no una carga de la relación: este
     * método solo se llama desde la página de perfil, nunca desde un listado.
     * La media de valoración se pondera por número de reseñas para que un
     * componente con una sola estrella no pese lo mismo que uno con cien.
     *
     * @return array{components: int, downloads: int, rating_avg: float|null, rating_count: int}
     */
    public function authorStats(): array
    {
        $row = $this->components()
            ->published()
            ->selectRaw('COUNT(*) as components')
            ->selectRaw('COALESCE(SUM(downloads), 0) as downloads')
            ->selectRaw('COALESCE(SUM(rating_avg * rating_count), 0) as rating_sum')
            ->selectRaw('COALESCE(SUM(rating_count), 0) as rating_count')
            ->first();

        $ratingCount = (int) ($row->rating_count ?? 0);

        return [
            'components' => (int) ($row->components ?? 0),
            'downloads' => (int) ($row->downloads ?? 0),
            'rating_avg' => $ratingCount > 0
                ? round(((float) $row->rating_sum) / $ratingCount, 2)
                : null,
            'rating_count' => $ratingCount,
        ];
    }
}
