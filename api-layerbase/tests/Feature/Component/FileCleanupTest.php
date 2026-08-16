<?php

namespace Tests\Feature\Component;

use App\Enums\ComponentFileType;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Ciclo de vida de los archivos de un componente.
 *
 * La regla es que el soft delete CONSERVA los archivos (si no, restaurar
 * devolvería un componente vacío) y solo el borrado definitivo los elimina.
 * Hasta ahora no existía ninguna vía de limpieza, así que los objetos se
 * acumulaban en el disco indefinidamente.
 */
class FileCleanupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_a_soft_deleted_component_keeps_its_files(): void
    {
        $component = $this->componentWithSource();
        $path = $component->files->first()->path;

        $component->delete();

        // Se tiene que poder restaurar con su contenido intacto.
        Storage::disk('local')->assertExists($path);
        $this->assertDatabaseCount('component_files', 1);
    }

    public function test_force_deleting_a_component_removes_its_files(): void
    {
        $component = $this->componentWithSource();
        $path = $component->files->first()->path;

        $component->forceDelete();

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseCount('component_files', 0);
    }

    public function test_the_purge_command_only_takes_components_deleted_long_ago(): void
    {
        $reciente = $this->componentWithSource();
        $antiguo = $this->componentWithSource();
        $pathAntiguo = $antiguo->files->first()->path;
        $pathReciente = $reciente->files->first()->path;

        $reciente->delete();
        $antiguo->delete();
        $antiguo->forceFill(['deleted_at' => now()->subDays(45)])->saveQuietly();

        $this->artisan('components:purge-deleted', ['--days' => 30])
            ->assertSuccessful();

        // El antiguo desaparece del todo; el recién borrado sigue restaurable.
        $this->assertDatabaseMissing('components', ['id' => $antiguo->id]);
        $this->assertSoftDeleted('components', ['id' => $reciente->id]);
        Storage::disk('local')->assertMissing($pathAntiguo);
        Storage::disk('local')->assertExists($pathReciente);
    }

    public function test_the_dry_run_does_not_delete_anything(): void
    {
        $component = $this->componentWithSource();
        $component->delete();
        $component->forceFill(['deleted_at' => now()->subDays(45)])->saveQuietly();

        $this->artisan('components:purge-deleted', ['--days' => 30, '--dry-run' => true])
            ->assertSuccessful();

        $this->assertSoftDeleted('components', ['id' => $component->id]);
        $this->assertDatabaseCount('component_files', 1);
    }

    public function test_the_purge_reports_when_there_is_nothing_to_do(): void
    {
        $this->artisan('components:purge-deleted')
            ->expectsOutputToContain('No hay componentes borrados')
            ->assertSuccessful();
    }

    private function componentWithSource(): Component
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
            'price' => 0,
        ]);
        $component->user_id = User::factory()->create()->id;
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

        return $component->fresh('files');
    }
}
