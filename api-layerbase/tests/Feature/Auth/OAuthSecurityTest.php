<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

/**
 * Seguridad del inicio de sesión con OAuth.
 *
 * Dos agujeros reales que cubren estos tests:
 *
 * 1. **Apropiación de cuenta por email.** `upsertUser()` vinculaba la identidad
 *    social a cualquier cuenta local con el mismo email. Como el registro no
 *    verificaba nada, bastaba con registrarse usando el correo de la víctima y
 *    esperar: al entrar ella con Google, su identidad quedaba enganchada a la
 *    cuenta del atacante, cuya contraseña él conocía.
 *
 * 2. **CSRF de inicio de sesión.** El flujo iba `stateless()` sin ningún `state`
 *    propio. El `state` es la protección CSRF del lado del cliente; el proveedor
 *    lo devuelve tal cual pero NO lo valida. Sin él, un atacante puede hacer que
 *    la víctima complete el flujo con el código de autorización del atacante y
 *    acabe con sesión iniciada en la cuenta de este.
 */
class OAuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    // --- Apropiación de cuenta -------------------------------------------

    public function test_oauth_does_not_link_to_an_unverified_account_with_the_same_email(): void
    {
        // El atacante se registró antes con el correo de la víctima.
        $attacker = User::factory()->unverified()->create([
            'email' => 'victima@example.com',
            'name' => 'Cuenta del atacante',
        ]);

        $this->mockSocialiteUser('github', id: '999', email: 'victima@example.com');

        $response = $this->get($this->callbackUrl('github'));

        // No se vincula y no se emite token: el ataque muere aquí.
        $response->assertRedirect();
        $this->assertStringContainsString('error=oauth_email_taken', $response->headers->get('Location'));

        $attacker->refresh();
        $this->assertNull($attacker->github_oauth_id);
        $this->assertSame(0, $attacker->tokens()->count());
    }

    public function test_oauth_does_link_to_a_verified_account_with_the_same_email(): void
    {
        // Cuenta verificada: el email SÍ prueba identidad, así que vincular es
        // correcto y es lo que espera quien ya tenía cuenta.
        $user = User::factory()->create(['email' => 'ada@example.com']);

        $this->mockSocialiteUser('github', id: '123', email: 'ada@example.com');

        $response = $this->get($this->callbackUrl('github'));

        $response->assertRedirect();
        $this->assertStringContainsString('/auth/callback#token=', $response->headers->get('Location'));
        $this->assertSame('123', $user->fresh()->github_oauth_id);
    }

    public function test_an_already_linked_account_logs_in_regardless_of_verification(): void
    {
        // Vínculo ya establecido por oauth id: no pasa por la búsqueda de email,
        // así que no le afecta la restricción.
        $user = User::factory()->unverified()->create(['github_oauth_id' => '555']);

        $this->mockSocialiteUser('github', id: '555', email: 'otro@example.com');

        $response = $this->get($this->callbackUrl('github'));

        $this->assertStringContainsString('/auth/callback#token=', $response->headers->get('Location'));
    }

    public function test_a_brand_new_oauth_user_is_created_verified(): void
    {
        $this->mockSocialiteUser('google', id: '777', email: 'nueva@example.com');

        $this->get($this->callbackUrl('google'))->assertRedirect();

        $user = User::where('email', 'nueva@example.com')->firstOrFail();
        $this->assertSame('777', $user->google_oauth_id);
        // El proveedor ya comprobó el email, y la cuenta no tiene contraseña.
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->password);
    }

    // --- CSRF (state) -----------------------------------------------------

    public function test_the_callback_without_state_is_rejected(): void
    {
        $this->mockSocialiteUser('github', id: '123', email: 'ada@example.com');

        $response = $this->get('/api/auth/github/callback');

        $this->assertStringContainsString('error=oauth_state', $response->headers->get('Location'));
        $this->assertSame(0, User::count());
    }

    public function test_a_made_up_state_is_rejected(): void
    {
        $this->mockSocialiteUser('github', id: '123', email: 'ada@example.com');

        $response = $this->get('/api/auth/github/callback?state=inventado');

        $this->assertStringContainsString('error=oauth_state', $response->headers->get('Location'));
        $this->assertSame(0, User::count());
    }

    public function test_a_state_cannot_be_reused(): void
    {
        $this->mockSocialiteUser('github', id: '123', email: 'ada@example.com');
        $state = $this->issueState('github');

        // Primer uso: válido.
        $this->get("/api/auth/github/callback?state={$state}");

        // Segundo uso del MISMO state: rechazado. Un callback capturado no se
        // puede reproducir.
        $response = $this->get("/api/auth/github/callback?state={$state}");
        $this->assertStringContainsString('error=oauth_state', $response->headers->get('Location'));
    }

    public function test_a_state_issued_for_another_provider_is_rejected(): void
    {
        $this->mockSocialiteUser('github', id: '123', email: 'ada@example.com');
        $state = $this->issueState('google');

        // Cruzar proveedores permitiría reutilizar un state legítimo.
        $response = $this->get("/api/auth/github/callback?state={$state}");

        $this->assertStringContainsString('error=oauth_state', $response->headers->get('Location'));
    }

    // --- Helpers ----------------------------------------------------------

    /** Emite un `state` válido, como haría el endpoint de redirect. */
    private function issueState(string $provider): string
    {
        $state = 'state-de-prueba-'.$provider;
        Cache::put("oauth_state:{$state}", $provider, now()->addMinutes(10));

        return $state;
    }

    /** URL de callback con un `state` recién emitido y válido. */
    private function callbackUrl(string $provider): string
    {
        return "/api/auth/{$provider}/callback?state=".$this->issueState($provider);
    }

    /** Sustituye al proveedor OAuth por un usuario social controlado. */
    private function mockSocialiteUser(string $provider, string $id, string $email): void
    {
        $socialUser = (new SocialiteUser)->map([
            'id' => $id,
            'name' => 'Usuario Social',
            'nickname' => 'social',
            'email' => $email,
            'avatar' => 'https://example.com/avatar.png',
        ]);

        $driver = Mockery::mock();
        $driver->shouldReceive('stateless')->andReturnSelf();
        $driver->shouldReceive('user')->andReturn($socialUser);

        Socialite::shouldReceive('driver')->with($provider)->andReturn($driver);
    }
}
