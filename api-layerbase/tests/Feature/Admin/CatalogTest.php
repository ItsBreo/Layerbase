<?php

namespace Tests\Feature\Admin;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Catálogo del panel de admin: categorías y etiquetas.
 *
 * Dos ideas distintas que conviene no mezclar. Una CATEGORÍA es estructura: la
 * crea un admin y no se puede borrar si alguien la está usando. Una ETIQUETA la
 * crea cualquier autor al escribirla, así que aquí no se crean — solo se limpian
 * las que se quedaron sin uso.
 *
 * Aparte se comprueban los contadores desnormalizados, que existían desde la
 * primera migración y **nadie escribía**: valían 0 en todas las filas, y el
 * autocompletado público de `/tags` ordena por ellos.
 */
class CatalogTest extends TestCase
{
    use RefreshDatabase;

    // --- Acceso -----------------------------------------------------------

    public function test_a_non_admin_cannot_touch_the_catalog(): void
    {
        $author = User::factory()->author()->create();

        $this->actingAs($author)->getJson('/api/admin/catalog/categories')->assertForbidden();
        $this->actingAs($author)->postJson('/api/admin/catalog/categories', [
            'name' => 'Intruso', 'stack' => 'all',
        ])->assertForbidden();
    }

    // --- Categorías -------------------------------------------------------

    public function test_an_admin_creates_a_category_with_an_automatic_slug(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/admin/catalog/categories', [
                'name' => 'Gráficas y datos',
                'stack' => 'react',
                'description' => 'Tablas, gráficas y visualización.',
            ])
            ->assertCreated()
            // El slug no se acepta como entrada: lo deriva el modelo del nombre.
            ->assertJsonPath('data.slug', 'graficas-y-datos');
    }

    public function test_two_categories_cannot_share_a_name(): void
    {
        Category::create(['name' => 'Formularios', 'stack' => 'all']);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/catalog/categories', ['name' => 'Formularios', 'stack' => 'all'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_renaming_a_category_keeps_its_slug(): void
    {
        $category = Category::create(['name' => 'Formularios', 'stack' => 'all']);

        $this->actingAs($this->admin())
            ->patchJson("/api/admin/catalog/categories/{$category->slug}", ['name' => 'Formularios y entradas'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Formularios y entradas')
            // El slug ya está en enlaces y filtros del marketplace: regenerarlo
            // los rompería en silencio.
            ->assertJsonPath('data.slug', 'formularios');
    }

    public function test_an_empty_category_can_be_deleted(): void
    {
        $category = Category::create(['name' => 'Vacía', 'stack' => 'all']);

        $this->actingAs($this->admin())
            ->deleteJson("/api/admin/catalog/categories/{$category->slug}")
            ->assertNoContent();

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_a_category_in_use_cannot_be_deleted(): void
    {
        $component = $this->publishedComponent();

        // La FK es restrictiva y ya lo impediría, pero con un 500 ilegible: se
        // comprueba antes para poder decir por qué y cuántos hay que mover.
        $this->actingAs($this->admin())
            ->deleteJson("/api/admin/catalog/categories/{$component->category->slug}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('category');

        $this->assertDatabaseHas('categories', ['id' => $component->category_id]);
    }

    public function test_the_listing_separates_published_from_total(): void
    {
        $component = $this->publishedComponent();
        // Un borrador más en la misma categoría: cuenta para el total, no para
        // el número público.
        $draft = $this->publishedComponent();
        $draft->forceFill([
            'category_id' => $component->category_id,
            'status' => ComponentStatus::Draft,
        ])->save();

        $response = $this->actingAs($this->admin())
            ->getJson('/api/admin/catalog/categories')
            ->assertOk();

        $row = collect($response->json())->firstWhere('id', $component->category_id);
        $this->assertSame(1, $row['components_count'], 'publicados');
        $this->assertSame(2, $row['total_components'], 'todos los estados');
    }

    // --- Etiquetas --------------------------------------------------------

    public function test_orphan_tags_can_be_listed_and_purged(): void
    {
        $used = Tag::create(['name' => 'dark-mode']);
        Tag::create(['name' => 'sin-usar-uno']);
        Tag::create(['name' => 'sin-usar-dos']);

        $component = $this->publishedComponent();
        $component->tags()->sync([$used->id]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/catalog/tags?orphan=1')
            ->assertOk()
            ->assertJsonCount(2);

        $this->actingAs($this->admin())
            ->deleteJson('/api/admin/catalog/tags')
            ->assertOk()
            ->assertJsonPath('deleted', 2);

        // La que sí se usa sobrevive.
        $this->assertDatabaseHas('tags', ['id' => $used->id]);
        $this->assertDatabaseCount('tags', 1);
    }

    public function test_a_tag_in_use_cannot_be_deleted(): void
    {
        $tag = Tag::create(['name' => 'en-uso']);
        $this->publishedComponent()->tags()->sync([$tag->id]);

        $this->actingAs($this->admin())
            ->deleteJson("/api/admin/catalog/tags/{$tag->slug}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('tag');
    }

    // --- Contadores desnormalizados ---------------------------------------

    public function test_publishing_a_component_updates_the_category_counter(): void
    {
        $component = $this->publishedComponent(ComponentStatus::Draft);

        // Un borrador no cuenta: el número se enseña en un catálogo público y
        // prometería componentes que nadie puede ver.
        $this->assertSame(0, $component->category->fresh()->components_count);

        $component->approve();

        $this->assertSame(1, $component->category->fresh()->components_count);
    }

    public function test_unpublishing_brings_the_counter_back_down(): void
    {
        $component = $this->publishedComponent();
        $this->assertSame(1, $component->category->fresh()->components_count);

        $component->unpublish();

        $this->assertSame(0, $component->category->fresh()->components_count);
    }

    public function test_moving_a_component_updates_both_categories(): void
    {
        $component = $this->publishedComponent();
        $origen = $component->category;
        $destino = Category::create(['name' => 'Destino', 'stack' => 'all']);

        $component->forceFill(['category_id' => $destino->id])->save();

        // La de origen se queda con uno menos: si solo se recalculara la nueva,
        // la anterior quedaría inflada para siempre.
        $this->assertSame(0, $origen->fresh()->components_count);
        $this->assertSame(1, $destino->fresh()->components_count);
    }

    public function test_tag_counters_follow_the_components_that_use_them(): void
    {
        $tag = Tag::create(['name' => 'animation']);
        $component = $this->publishedComponent();

        $component->tags()->sync([$tag->id]);
        Tag::recount([$tag->id]);
        $this->assertSame(1, $tag->fresh()->components_count);

        $component->unpublish();
        $this->assertSame(0, $tag->fresh()->components_count);
    }

    // --- Helpers ----------------------------------------------------------

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    private function publishedComponent(ComponentStatus $status = ComponentStatus::Published): Component
    {
        $category = Category::create([
            'name' => 'Cards '.uniqid(),
            'stack' => 'all',
        ]);

        $component = new Component([
            'title' => 'Stat Counter '.uniqid(),
            'description' => 'Tarjeta de métrica con contador animado.',
            'category_id' => $category->id,
            'stack' => Stack::React->value,
            'price' => 0,
        ]);
        $component->user_id = User::factory()->author()->create()->id;
        $component->status = $status;
        $component->published_at = $status === ComponentStatus::Published ? now() : null;
        $component->save();

        return $component->fresh();
    }
}
