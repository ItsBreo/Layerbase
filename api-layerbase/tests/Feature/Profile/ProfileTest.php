<?php

namespace Tests\Feature\Profile;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Perfil del usuario autenticado: datos públicos, avatar, contraseña y
 * visibilidad del resumen de autor.
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_update_their_public_profile(): void
    {
        $user = User::factory()->create(['name' => 'Ada']);

        $this->actingAs($user)
            ->patchJson('/api/auth/profile', [
                'name' => 'Ada Lovelace',
                'bio' => 'Escribo componentes.',
                'website' => 'https://ada.dev',
                'github_username' => '@ada',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Ada Lovelace')
            ->assertJsonPath('bio', 'Escribo componentes.')
            // La arroba se normaliza fuera: se guarda solo el handle.
            ->assertJsonPath('github_username', 'ada');
    }

    public function test_the_profile_endpoint_cannot_escalate_privileges(): void
    {
        $user = User::factory()->create(['name' => 'Ada']);

        $this->actingAs($user)
            ->patchJson('/api/auth/profile', [
                'name' => 'Ada',
                'role' => UserRole::Admin->value,
                'banned' => true,
            ])
            ->assertOk();

        $user->refresh();
        $this->assertSame(UserRole::User, $user->role);
        $this->assertFalse($user->banned);
    }

    public function test_an_empty_website_clears_the_field(): void
    {
        $user = User::factory()->create(['website' => 'https://viejo.dev']);

        $this->actingAs($user)
            ->patchJson('/api/auth/profile', ['website' => ''])
            ->assertOk()
            ->assertJsonPath('website', null);
    }

    public function test_a_guest_cannot_touch_the_profile(): void
    {
        $this->patchJson('/api/auth/profile', ['name' => 'Nadie'])
            ->assertUnauthorized();
    }

    public function test_changing_the_password_requires_the_current_one(): void
    {
        $user = User::factory()->create(['password' => 'password1234']);

        $this->actingAs($user)
            ->putJson('/api/auth/password', [
                'current_password' => 'equivocada',
                'password' => 'nuevaClave1234',
                'password_confirmation' => 'nuevaClave1234',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');
    }

    public function test_a_user_can_change_their_password(): void
    {
        $user = User::factory()->create(['password' => 'password1234']);

        $this->actingAs($user)
            ->putJson('/api/auth/password', [
                'current_password' => 'password1234',
                'password' => 'nuevaClave1234',
                'password_confirmation' => 'nuevaClave1234',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('nuevaClave1234', $user->fresh()->password));
    }

    public function test_a_user_can_upload_an_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/auth/avatar', [
                'avatar' => UploadedFile::fake()->image('yo.png', 200, 200),
            ])
            ->assertOk();

        $this->assertStringContainsString('/avatars/', $response->json('avatar_url'));
        $this->assertNotEmpty(Storage::disk('public')->allFiles("avatars/{$user->id}"));
    }

    public function test_the_avatar_must_be_an_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/avatar', [
                'avatar' => UploadedFile::fake()->create('codigo.zip', 10, 'application/zip'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('avatar');
    }

    public function test_the_author_summary_is_private_by_default_but_visible_to_its_owner(): void
    {
        $user = User::factory()->create();

        $this->assertFalse($user->stats_public);

        $this->actingAs($user)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('stats_public', false)
            ->assertJsonStructure(['stats' => ['components', 'downloads', 'rating_avg']]);
    }

    public function test_a_user_can_publish_their_author_summary(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patchJson('/api/auth/profile', ['stats_public' => true])
            ->assertOk()
            ->assertJsonPath('stats_public', true);
    }

    public function test_listings_never_carry_the_author_summary(): void
    {
        // El resumen cuesta una query por usuario: no debe colarse en un
        // listado de componentes, ni siquiera del autor que lo hizo público.
        $user = User::factory()->create(['stats_public' => true]);

        $this->actingAs($user)
            ->getJson('/api/components')
            ->assertOk()
            ->assertJsonMissingPath('data.0.author.stats');
    }
}
