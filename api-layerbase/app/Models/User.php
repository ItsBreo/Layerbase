<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
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
])]
#[Hidden(['password', 'remember_token', 'github_oauth_id', 'google_oauth_id'])]
class User extends Authenticatable
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
        ];
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
}
