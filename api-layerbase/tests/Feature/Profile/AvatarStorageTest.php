<?php

namespace Tests\Feature\Profile;

use App\Models\User;
use App\Services\AvatarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Forma de la URL del avatar según el disco.
 *
 * Frontera del despliegue: en local la URL se guarda relativa (funciona tras el
 * proxy de Vite y no depende del puerto), pero en un disco remoto tiene que
 * quedar absoluta. Recortarla siempre —como se hacía— dejaba el avatar
 * apuntando al dominio del FRONTEND, donde no hay nada que servir.
 */
class AvatarStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_on_a_local_disk_the_url_is_stored_relative(): void
    {
        Storage::fake('public');
        config()->set('profile.avatar_disk', 'public');

        $user = User::factory()->create();

        $url = app(AvatarService::class)->store(
            $user,
            UploadedFile::fake()->image('yo.png')
        );

        $this->assertStringStartsWith('/', $url);
        $this->assertStringNotContainsString('http', $url);
    }

    public function test_on_a_remote_disk_the_url_keeps_its_domain(): void
    {
        // Disco remoto simulado. `Storage::fake` guarda de verdad en local (así
        // el fichero se escribe y se puede comprobar), pero con `url` propia
        // devuelve URLs absolutas como haría R2.
        Storage::fake('r2_prueba', ['url' => 'https://cdn.ejemplo.test']);

        // El driver se marca como remoto DESPUÉS del fake: es la condición que
        // decide si la URL se recorta, y es justo lo que se está probando.
        config()->set('filesystems.disks.r2_prueba.driver', 's3');
        config()->set('profile.avatar_disk', 'r2_prueba');

        $user = User::factory()->create();

        $url = app(AvatarService::class)->store(
            $user,
            UploadedFile::fake()->image('yo.png')
        );

        $this->assertStringStartsWith('https://cdn.ejemplo.test', $url);
        $this->assertSame($url, $user->fresh()->avatar_url);
    }

    public function test_replacing_an_avatar_deletes_the_previous_file(): void
    {
        Storage::fake('public');
        config()->set('profile.avatar_disk', 'public');

        $user = User::factory()->create();
        $servicio = app(AvatarService::class);

        $servicio->store($user, UploadedFile::fake()->image('primera.png'));
        $primera = $this->pathOf($user->fresh()->avatar_url);
        Storage::disk('public')->assertExists($primera);

        $servicio->store($user->fresh(), UploadedFile::fake()->image('segunda.png'));

        Storage::disk('public')->assertMissing($primera);
    }

    public function test_an_external_oauth_avatar_is_never_deleted(): void
    {
        Storage::fake('public');
        config()->set('profile.avatar_disk', 'public');

        // Tras entrar con GitHub, `avatar_url` apunta fuera: no hay nada
        // nuestro que borrar y el servicio no debe intentarlo.
        $user = User::factory()->create([
            'avatar_url' => 'https://avatars.githubusercontent.com/u/583231?v=4',
        ]);

        app(AvatarService::class)->store($user, UploadedFile::fake()->image('yo.png'));

        $this->assertStringContainsString('/avatars/', (string) $user->fresh()->avatar_url);
    }

    private function pathOf(?string $url): string
    {
        preg_match('~(avatars/\d+/[^/?#]+)~', (string) $url, $coincidencia);

        return $coincidencia[1] ?? '';
    }
}
