<?php

namespace Tests\Feature\Component;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Subida de archivos de un componente, con foco en la validación de tipo.
 *
 * El README no se valida por MIME sniffeado: finfo clasifica por contenido y un
 * README con ejemplos de código se detecta como application/javascript. Ese
 * falso negativo hacia imposible subir un README util, que es justo lo que
 * cubren los dos primeros casos.
 */
class UploadFileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_a_readme_with_code_blocks_is_accepted(): void
    {
        $component = $this->draftOwnedByCurrentUser();

        $readme = <<<'MD'
        # Pricing Toggle Card

        ## Uso

        ```jsx
        import { PricingCard } from './PricingCard'

        export default function Planes() {
          return <PricingCard plan="Pro" monthlyPrice={12} />
        }
        ```
        MD;

        $this->postJson("/api/components/{$component->slug}/files", [
            'type' => 'readme',
            'file' => UploadedFile::fake()->createWithContent('README.md', $readme),
        ])->assertCreated();
    }

    public function test_a_plain_prose_readme_is_still_accepted(): void
    {
        $component = $this->draftOwnedByCurrentUser();

        $this->postJson("/api/components/{$component->slug}/files", [
            'type' => 'readme',
            'file' => UploadedFile::fake()->createWithContent('README.md', "# Titulo\n\nTexto normal.\n"),
        ])->assertCreated();
    }

    public function test_a_readme_with_the_wrong_extension_is_rejected(): void
    {
        $component = $this->draftOwnedByCurrentUser();

        $this->postJson("/api/components/{$component->slug}/files", [
            'type' => 'readme',
            'file' => UploadedFile::fake()->createWithContent('notas.pdf', 'texto'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_a_binary_readme_is_rejected(): void
    {
        $component = $this->draftOwnedByCurrentUser();

        // Bytes no decodificables como UTF-8: un binario renombrado a .md.
        $this->postJson("/api/components/{$component->slug}/files", [
            'type' => 'readme',
            'file' => UploadedFile::fake()->createWithContent('README.md', "\xFF\xFE\x00binario"),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_the_source_still_rejects_what_is_not_a_zip(): void
    {
        $component = $this->draftOwnedByCurrentUser();

        // La relajación es solo para el readme: el código sigue exigiendo zip.
        $this->postJson("/api/components/{$component->slug}/files", [
            'type' => 'source',
            'file' => UploadedFile::fake()->createWithContent('source.txt', 'esto no es un zip'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    /** Borrador del usuario autenticado (la subida exige ser su autor). */
    private function draftOwnedByCurrentUser(): Component
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $category = Category::create([
            'name' => 'Cards y layout',
            'slug' => 'cards-y-layout-'.uniqid(),
            'stack' => 'all',
        ]);

        $component = new Component([
            'title' => 'Pricing Toggle Card',
            'description' => 'Tarjeta de precios con conmutador mensual/anual.',
            'category_id' => $category->id,
            'stack' => Stack::React->value,
            'price' => 0,
        ]);
        $component->user_id = $user->id;
        $component->status = ComponentStatus::Draft;
        $component->save();

        return $component;
    }
}
