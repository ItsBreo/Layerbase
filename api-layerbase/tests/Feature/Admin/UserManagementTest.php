<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Gestión de usuarios del panel de admin: roles y suspensiones.
 *
 * El grueso de los casos protege la invariante que sostiene el módulo: un admin
 * no puede actuar sobre sí mismo. Eso es lo que garantiza que nunca se puede
 * dejar la plataforma sin ningún admin activo — quien ejecuta la acción no
 * puede ser su objetivo, así que él mismo sobrevive siempre.
 */
class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    // --- Acceso -----------------------------------------------------------

    public function test_a_non_admin_cannot_list_users(): void
    {
        $this->actingAs(User::factory()->author()->create())
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_a_guest_cannot_list_users(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    // --- Listado ----------------------------------------------------------

    public function test_an_admin_lists_users_and_can_search_them(): void
    {
        // Nombre y email explícitos, no los de Faker: con datos aleatorios el
        // admin podía contener por casualidad el término buscado y hacer fallar
        // la búsqueda una vez de cada tantas. Un test que falla al azar es peor
        // que no tenerlo.
        $admin = User::factory()->admin()->create([
            'name' => 'Quien administra',
            'email' => 'admin@test.com',
        ]);
        User::factory()->create(['name' => 'Ada Lovelace', 'email' => 'ada@test.com']);
        User::factory()->create(['name' => 'Grace Hopper', 'email' => 'grace@test.com']);

        $this->actingAs($admin)->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // La búsqueda mira nombre y email.
        $this->actingAs($admin)->getJson('/api/admin/users?q=ada')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Ada Lovelace');

        $this->actingAs($admin)->getJson('/api/admin/users?q=grace@test')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Grace Hopper');
    }

    public function test_the_listing_filters_by_role_and_by_banned(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->author()->create();
        User::factory()->create(['banned' => true, 'ban_reason' => 'Spam reiterado.']);

        $this->actingAs($admin)->getJson('/api/admin/users?role=author')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.role', UserRole::Author->value);

        $this->actingAs($admin)->getJson('/api/admin/users?banned=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.banned', true);

        // `banned=0` es un filtro legítimo, no un "sin filtro".
        $this->actingAs($admin)->getJson('/api/admin/users?banned=0')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_the_counts_endpoint_breaks_users_down_by_role(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->author()->count(2)->create();
        User::factory()->create(['banned' => true, 'ban_reason' => 'Spam reiterado.']);

        $this->actingAs($admin)->getJson('/api/admin/users/counts')
            ->assertOk()
            ->assertJsonPath('data.total', 4)
            ->assertJsonPath('data.banned', 1)
            ->assertJsonPath('data.roles.admin', 1)
            ->assertJsonPath('data.roles.author', 2)
            ->assertJsonPath('data.roles.user', 1);
    }

    // --- Roles ------------------------------------------------------------

    public function test_an_admin_promotes_a_user_to_author(): void
    {
        $user = User::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/admin/users/{$user->id}/role", ['role' => 'author'])
            ->assertOk()
            ->assertJsonPath('data.role', UserRole::Author->value);

        $this->assertSame(UserRole::Author, $user->fresh()->role);
    }

    public function test_an_admin_cannot_change_their_own_role(): void
    {
        $admin = User::factory()->admin()->create();

        // La invariante: sin esto, el último admin podría degradarse y dejar la
        // plataforma sin nadie que la administre.
        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$admin->id}/role", ['role' => 'user'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');

        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
    }

    public function test_an_invalid_role_is_refused(): void
    {
        $user = User::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/admin/users/{$user->id}/role", ['role' => 'superadmin'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');
    }

    // --- Suspensión -------------------------------------------------------

    public function test_banning_a_user_stores_the_reason_and_revokes_their_tokens(): void
    {
        $user = User::factory()->create();
        $user->createToken('sesión activa');
        $this->assertSame(1, $user->tokens()->count());

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/users/{$user->id}/ban", ['reason' => 'Sube componentes plagiados.'])
            ->assertOk()
            ->assertJsonPath('data.banned', true);

        $user->refresh();
        $this->assertTrue($user->banned);
        $this->assertSame('Sube componentes plagiados.', $user->ban_reason);
        // El corte tiene que ser inmediato, no en la próxima expiración.
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_a_ban_without_a_reason_is_refused(): void
    {
        $user = User::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/users/{$user->id}/ban", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');

        $this->assertFalse($user->fresh()->banned);
    }

    public function test_an_admin_cannot_ban_themselves(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson("/api/admin/users/{$admin->id}/ban", ['reason' => 'Probando a autobanearme.'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');

        $this->assertFalse($admin->fresh()->banned);
    }

    public function test_a_banned_user_is_locked_out_of_authenticated_endpoints(): void
    {
        $user = User::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/users/{$user->id}/ban", ['reason' => 'Sube componentes plagiados.'])
            ->assertOk();

        // Lo aplica EnsureAccountIsActive: el baneo vale aunque la petición
        // llegue con una sesión que ya estaba autenticada.
        $this->actingAs($user->fresh())->getJson('/api/auth/me')->assertForbidden();
    }

    public function test_unbanning_restores_access(): void
    {
        $user = User::factory()->create(['banned' => true, 'ban_reason' => 'Spam reiterado.']);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/users/{$user->id}/unban")
            ->assertOk()
            ->assertJsonPath('data.banned', false);

        $user->refresh();
        $this->assertFalse($user->banned);
        // El motivo se limpia: conservarlo dejaría un aviso que ya no aplica.
        $this->assertNull($user->ban_reason);

        $this->actingAs($user)->getJson('/api/auth/me')->assertOk();
    }

    public function test_a_regular_user_cannot_ban_anyone(): void
    {
        $victim = User::factory()->create();

        $this->actingAs(User::factory()->author()->create())
            ->postJson("/api/admin/users/{$victim->id}/ban", ['reason' => 'No deberia poder hacer esto.'])
            ->assertForbidden();

        $this->assertFalse($victim->fresh()->banned);
    }
}
