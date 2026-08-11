<?php

namespace Tests\Feature\Component;

use App\Enums\ComponentFileType;
use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * GET /components/{component}/preview-code — código que alimenta el render en
 * vivo de la ficha pública.
 *
 * Lo que se protege aquí es el modelo de negocio: en un componente de pago el
 * código ES el producto, así que el endpoint no puede servirlo a quien no lo
 * ha comprado, ni siquiera "solo para previsualizar".
 */
class PreviewCodeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_a_guest_can_preview_a_free_published_component(): void
    {
        $component = $this->makeComponent(price: 0);

        $this->getJson("/api/components/{$component->slug}/preview-code")
            ->assertOk()
            ->assertJsonStructure(['url', 'filename', 'expires_in']);
    }

    public function test_a_guest_cannot_preview_a_paid_component(): void
    {
        $component = $this->makeComponent(price: 12.50);

        $this->getJson("/api/components/{$component->slug}/preview-code")
            ->assertForbidden();
    }

    public function test_a_logged_in_user_cannot_preview_a_paid_component_they_have_not_bought(): void
    {
        $component = $this->makeComponent(price: 12.50);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/components/{$component->slug}/preview-code")
            ->assertForbidden();
    }

    public function test_the_author_can_preview_their_own_paid_draft(): void
    {
        $component = $this->makeComponent(price: 30, status: ComponentStatus::Draft);

        $this->actingAs($component->author)
            ->getJson("/api/components/{$component->slug}/preview-code")
            ->assertOk();
    }

    public function test_a_stranger_cannot_preview_an_unpublished_component(): void
    {
        $component = $this->makeComponent(price: 0, status: ComponentStatus::Draft);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/components/{$component->slug}/preview-code")
            ->assertForbidden();
    }

    public function test_it_returns_404_when_there_is_no_source_to_render(): void
    {
        $component = $this->makeComponent(price: 0, withSource: false);

        $this->getJson("/api/components/{$component->slug}/preview-code")
            ->assertNotFound();
    }

    /** Componente publicado (por defecto) de un autor nuevo, con su source. */
    private function makeComponent(
        float $price,
        ComponentStatus $status = ComponentStatus::Published,
        bool $withSource = true,
    ): Component {
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
            'price' => $price,
        ]);
        $component->user_id = User::factory()->create()->id;
        $component->status = $status;
        $component->published_at = $status === ComponentStatus::Published ? now() : null;
        $component->save();

        if ($withSource) {
            $path = "components/{$component->id}/source/source.zip";
            Storage::disk('local')->put($path, 'contenido-zip');

            $component->files()->create([
                'type' => ComponentFileType::Source,
                'disk' => 'local',
                'path' => $path,
                'filename' => 'source.zip',
                'mime_type' => 'application/zip',
                'size_bytes' => 13,
            ]);
        }

        return $component->fresh();
    }
}
