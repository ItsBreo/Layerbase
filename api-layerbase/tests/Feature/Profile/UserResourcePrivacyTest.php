<?php

namespace Tests\Feature\Profile;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Qué campos de un usuario son públicos y cuáles no.
 *
 * Regresión de una fuga real: `UserResource` se serializa como `author` en cada
 * tarjeta del listado de componentes, que es un endpoint abierto. Como el email
 * se exponía sin condición, un `GET /components` SIN AUTENTICAR devolvía el
 * correo de todos los autores de la plataforma.
 *
 * Los campos internos (email, estado de Stripe, moderación) solo los ve el
 * propio usuario o un admin.
 */
class UserResourcePrivacyTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<string> Campos que nunca deben viajar a un tercero. */
    private const PRIVATE_FIELDS = [
        'email',
        'email_verified_at',
        'stripe_onboarded',
        'banned',
        'ban_reason',
    ];

    public function test_the_public_listing_does_not_leak_the_author_email(): void
    {
        $author = $this->authorWithPublishedComponent();

        $response = $this->getJson('/api/components')->assertOk();

        $payload = $response->json('data.0.author');
        $this->assertSame($author->name, $payload['name']);

        foreach (self::PRIVATE_FIELDS as $field) {
            $this->assertArrayNotHasKey($field, $payload, "El campo `{$field}` no debe ser público.");
        }
    }

    public function test_a_logged_in_stranger_does_not_see_the_author_email_either(): void
    {
        $this->authorWithPublishedComponent();

        // Tener cuenta no da acceso a los datos internos de otro usuario.
        $payload = $this->actingAs(User::factory()->create())
            ->getJson('/api/components')
            ->assertOk()
            ->json('data.0.author');

        $this->assertArrayNotHasKey('email', $payload);
    }

    public function test_an_admin_does_see_the_internal_fields(): void
    {
        $author = $this->authorWithPublishedComponent();

        // El panel de admin necesita el email para identificar cuentas.
        $payload = $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/components')
            ->assertOk()
            ->json('data.0.author');

        $this->assertSame($author->email, $payload['email']);
        $this->assertArrayHasKey('banned', $payload);
    }

    public function test_a_user_sees_their_own_email(): void
    {
        $user = User::factory()->create();

        // Si esto se rompiera, el dashboard dejaría de poder mostrar la cuenta.
        $this->actingAs($user)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', $user->email);
    }

    public function test_login_returns_the_users_own_email(): void
    {
        $user = User::factory()->create(['email' => 'ada@example.com']);

        // En el login la petición aún NO va autenticada (el token se emite en
        // esa misma respuesta), así que el recurso se construye con `forSelf`.
        // Sin eso, el usuario no recibiría ni sus propios datos al entrar.
        $this->postJson('/api/auth/login', [
            'email' => 'ada@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'ada@example.com');
    }

    /** Autor con un componente publicado, para que salga en el listado. */
    private function authorWithPublishedComponent(): User
    {
        $author = User::factory()->author()->create();

        $category = Category::create([
            'name' => 'Cards y layout',
            'slug' => 'cards-y-layout-'.uniqid(),
            'stack' => 'all',
        ]);

        $component = new Component([
            'title' => 'Stat Counter Card',
            'description' => 'Tarjeta de métrica con contador animado.',
            'category_id' => $category->id,
            'stack' => Stack::React->value,
            'price' => 0,
        ]);
        $component->user_id = $author->id;
        $component->status = ComponentStatus::Published;
        $component->published_at = now();
        $component->save();

        return $author;
    }
}
