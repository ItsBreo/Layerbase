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
 * Contador de descargas.
 *
 * `downloads` se enseña en las tarjetas, en la ficha y en el resumen de autor,
 * pero nadie lo incrementaba: era una métrica visible que siempre mostraba lo
 * que hubiera dejado el seeder.
 *
 * Cuenta la ENTREGA de la URL firmada, no la descarga efectiva del archivo: el
 * fichero lo baja el cliente contra el disco sin volver a pasar por la API.
 */
class DownloadCounterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_downloading_increments_the_counter(): void
    {
        $component = $this->publishedFreeComponent();
        $this->assertSame(0, $component->downloads);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/components/{$component->slug}/download")
            ->assertOk();

        $this->assertSame(1, $component->fresh()->downloads);
    }

    public function test_repeated_downloads_keep_counting(): void
    {
        $component = $this->publishedFreeComponent();
        $user = User::factory()->create();

        foreach (range(1, 3) as $_) {
            $this->actingAs($user)
                ->getJson("/api/components/{$component->slug}/download")
                ->assertOk();
        }

        $this->assertSame(3, $component->fresh()->downloads);
    }

    public function test_previewing_does_not_count_as_a_download(): void
    {
        $component = $this->publishedFreeComponent();

        // Endpoint distinto a propósito: previsualizar en el sandbox de la
        // ficha no es descargar, y no debe inflar la métrica del autor.
        $this->getJson("/api/components/{$component->slug}/preview-code")->assertOk();

        $this->assertSame(0, $component->fresh()->downloads);
    }

    public function test_a_rejected_download_does_not_increment_the_counter(): void
    {
        $component = $this->publishedFreeComponent(price: 15);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/components/{$component->slug}/download")
            ->assertForbidden();

        $this->assertSame(0, $component->fresh()->downloads);
    }

    private function publishedFreeComponent(float $price = 0): Component
    {
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
        $component->status = ComponentStatus::Published;
        $component->published_at = now();
        $component->save();

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

        return $component->fresh();
    }
}
