<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_and_receives_a_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']])
            ->assertJsonPath('user.role', 'user');

        $this->assertDatabaseHas('users', ['email' => 'ada@example.com']);
    }

    public function test_registration_never_exposes_the_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Grace',
            'email' => 'grace@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
        ]);

        $response->assertCreated();
        $this->assertArrayNotHasKey('password', $response->json('user'));
    }

    public function test_a_user_can_log_in_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'ada@example.com',
            'password' => 'password1234',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'ada@example.com',
            'password' => 'password1234',
        ])->assertOk()->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create(['email' => 'ada@example.com', 'password' => 'password1234']);

        $this->postJson('/api/auth/login', [
            'email' => 'ada@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJsonValidationErrorFor('email');
    }

    public function test_banned_user_cannot_log_in(): void
    {
        User::factory()->create([
            'email' => 'ban@example.com',
            'password' => 'password1234',
            'banned' => true,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'ban@example.com',
            'password' => 'password1234',
        ])->assertStatus(403);
    }

    public function test_authenticated_user_can_fetch_themselves_and_log_out(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('id', $user->id);

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        // El token queda revocado tras el logout.
        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_guest_cannot_access_protected_endpoint(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_role_middleware_blocks_non_admins_and_allows_admins(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($user)->getJson('/api/admin/ping')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/admin/ping')->assertOk();
    }
}
