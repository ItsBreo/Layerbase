<?php

namespace Tests\Feature\Auth;

use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Verificación de la dirección de email.
 *
 * **El email se da por verificado con solo entrar.** Es una decisión tomada a
 * conciencia: sin dominio propio desde el que mandar correo, exigir
 * verificación real dejaría la plataforma inutilizable, porque publicar la
 * exige.
 *
 * A cambio, `email_verified_at` ya NO demuestra que el correo sea de quien lo
 * registró — solo que la cuenta se ha usado. La defensa contra la apropiación
 * de cuenta se sostiene entera en la otra mitad, en `OAuthSecurityTest`: OAuth
 * no vincula identidades por email en ningún caso.
 *
 * La maquinaria de verificación por enlace sigue montada y probada aquí. No es
 * código muerto por descuido: es lo que permite reactivarla quitando dos
 * llamadas el día que haya un dominio.
 */
class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registering_leaves_the_account_verified_and_sends_nothing(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
        ])->assertCreated();

        $user = User::where('email', 'ada@example.com')->firstOrFail();

        $this->assertNotNull($user->email_verified_at);

        // Y no se manda correo: el orden importa, porque el listener de Laravel
        // solo envía si la cuenta NO está verificada. Verificar antes de
        // disparar el evento es lo que lo silencia, sin desmontar nada.
        Notification::assertNothingSent();
    }

    public function test_signing_in_verifies_an_account_that_was_not(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/auth/login', [
            'email' => 'ada@example.com',
            'password' => 'password',
        ])->assertOk();

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_a_failed_sign_in_does_not_verify_anything(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'ada@example.com']);

        // Si bastara con intentarlo, cualquiera verificaría la cuenta de otro
        // con solo teclear su correo.
        $this->postJson('/api/auth/login', [
            'email' => 'ada@example.com',
            'password' => 'la-que-no-es',
        ])->assertStatus(422);

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_signed_link_verifies_the_account(): void
    {
        $user = User::factory()->unverified()->create();

        $this->get($this->verificationUrl($user))->assertRedirect();

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_an_unsigned_link_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        // Sin firma no hay verificación posible: si bastara con conocer el id y
        // el hash del email, cualquiera verificaría cuentas ajenas.
        $this->get("/api/auth/email/verify/{$user->id}/".sha1($user->email))
            ->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_link_with_the_wrong_hash_does_not_verify(): void
    {
        $user = User::factory()->unverified()->create();

        // URL correctamente firmada pero con el hash de OTRO email: la firma
        // sola no basta, el hash tiene que corresponder a la cuenta.
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id,
            'hash' => sha1('otro@example.com'),
        ]);

        $this->get($url)->assertRedirect();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_the_resend_endpoint_sends_the_email_again(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/email/verification-notification')
            ->assertOk();

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_the_resend_endpoint_does_nothing_for_a_verified_account(): void
    {
        Notification::fake();
        $user = User::factory()->create(); // La factory crea cuentas verificadas.

        // Responde igual que si no lo estuviera: el endpoint no puede servir
        // para averiguar el estado de verificación de una cuenta.
        $this->actingAs($user)
            ->postJson('/api/auth/email/verification-notification')
            ->assertOk();

        Notification::assertNothingSent();
    }

    // --- Gate de publicación ---------------------------------------------

    public function test_an_unverified_user_cannot_submit_a_component_for_review(): void
    {
        $component = $this->draftOf(User::factory()->unverified()->create());

        // Se puede entrar y navegar sin verificar; lo que no se puede es poner
        // algo en el marketplace desde una dirección que nadie ha confirmado.
        $this->actingAs($component->author)
            ->postJson("/api/components/{$component->slug}/submit")
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertSame('draft', $component->fresh()->status->value);
    }

    public function test_the_same_user_can_submit_once_verified(): void
    {
        $user = User::factory()->unverified()->create();
        $component = $this->draftOf($user);

        $this->get($this->verificationUrl($user))->assertRedirect();

        $this->actingAs($user->fresh())
            ->postJson("/api/components/{$component->slug}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_review');
    }

    /** Borrador con código fuente (precondición de `submit`) del usuario dado. */
    private function draftOf(User $user): Component
    {
        Storage::fake('local');

        $category = Category::create([
            'name' => 'Cards y layout',
            'slug' => 'cards-y-layout-'.uniqid(),
            'stack' => 'all',
        ]);

        $component = new Component([
            'title' => 'Stat Counter Card',
            'description' => 'Tarjeta de métrica con contador animado.',
            'category_id' => $category->id,
            'stack' => 'react',
            'price' => 0,
        ]);
        $component->user_id = $user->id;
        $component->save();

        $path = "components/{$component->id}/source/source.zip";
        Storage::disk('local')->put($path, 'contenido-zip');
        $component->files()->create([
            'type' => 'source',
            'disk' => 'local',
            'path' => $path,
            'filename' => 'source.zip',
            'mime_type' => 'application/zip',
            'size_bytes' => 13,
        ]);

        return $component->fresh();
    }

    /** URL firmada válida, como la que construye Laravel para el correo. */
    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);
    }
}
