<?php

namespace Tests\Feature\Auth;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Una petición sin autenticar a la API responde 401 en JSON, SIEMPRE.
 *
 * Detectado en el despliegue: sin la cabecera `Accept: application/json`,
 * Laravel intentaba redirigir a la ruta `login` —que en una API desacoplada no
 * existe— y devolvía un 500 con la traza dentro en vez de un 401 limpio.
 *
 * Los tests que había usaban `getJson()`, que manda esa cabecera, así que
 * ninguno pasaba por el camino roto. Aquí se usa `get()` a propósito: es como
 * llega un enlace de descarga abierto directamente en el navegador.
 */
class UnauthenticatedApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_request_without_the_json_header_still_gets_401(): void
    {
        $componente = $this->makeComponent();

        $this->get("/api/components/{$componente->slug}/download")
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }

    public function test_the_json_header_path_also_gets_401(): void
    {
        $componente = $this->makeComponent();

        $this->getJson("/api/components/{$componente->slug}/download")
            ->assertUnauthorized();
    }

    public function test_the_401_never_leaks_a_stack_trace(): void
    {
        $respuesta = $this->get('/api/auth/me');

        $respuesta->assertUnauthorized();
        $this->assertArrayNotHasKey('exception', $respuesta->json());
        $this->assertArrayNotHasKey('trace', $respuesta->json());
    }

    private function makeComponent(): Component
    {
        $categoria = Category::create([
            'name' => 'Cards y layout',
            'slug' => 'cards-y-layout-'.uniqid(),
            'stack' => 'all',
        ]);

        $componente = new Component([
            'title' => 'Stat Counter Card',
            'description' => 'Tarjeta de metrica con contador animado.',
            'category_id' => $categoria->id,
            'stack' => Stack::React->value,
            'price' => 12.50,
        ]);
        $componente->user_id = User::factory()->create()->id;
        $componente->status = ComponentStatus::Published;
        $componente->published_at = now();
        $componente->save();

        return $componente;
    }
}
