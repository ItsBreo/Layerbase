<?php

namespace Tests\Feature\Admin;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\ComponentView;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Resumen de la plataforma y registro de visitas.
 *
 * Lo que más importa aquí es QUÉ cuenta como visita: si contaran también las
 * del propio autor, la métrica mediría sobre todo cuántas veces entra alguien
 * a mirar su propio trabajo mientras lo prepara, no el interés real.
 */
class MetricsTest extends TestCase
{
    use RefreshDatabase;

    // --- Acceso -----------------------------------------------------------

    public function test_a_non_admin_cannot_read_the_metrics(): void
    {
        $this->actingAs(User::factory()->author()->create())
            ->getJson('/api/admin/metrics')
            ->assertForbidden();
    }

    public function test_a_guest_cannot_read_the_metrics(): void
    {
        $this->getJson('/api/admin/metrics')->assertUnauthorized();
    }

    // --- Registro de visitas ---------------------------------------------

    public function test_visiting_a_published_component_counts_a_view(): void
    {
        $component = $this->makeComponent(ComponentStatus::Published);

        $this->getJson("/api/components/{$component->slug}")->assertOk();

        $this->assertDatabaseHas('component_views', [
            'component_id' => $component->id,
            'viewed_on' => now()->toDateString(),
            'count' => 1,
        ]);
    }

    public function test_views_on_the_same_day_accumulate_in_one_row(): void
    {
        $component = $this->makeComponent(ComponentStatus::Published);

        foreach (range(1, 3) as $_) {
            $this->getJson("/api/components/{$component->slug}")->assertOk();
        }

        // Una fila por componente y día, con el contador subido: si se creara
        // una fila por visita, la tabla crecería sin control.
        $this->assertSame(1, ComponentView::query()->count());
        $this->assertDatabaseHas('component_views', [
            'component_id' => $component->id,
            'count' => 3,
        ]);
    }

    public function test_the_authors_own_visits_are_not_counted(): void
    {
        $component = $this->makeComponent(ComponentStatus::Published);

        $this->actingAs($component->author)
            ->getJson("/api/components/{$component->slug}")
            ->assertOk();

        $this->assertDatabaseCount('component_views', 0);
    }

    public function test_an_unpublished_component_does_not_count_views(): void
    {
        $component = $this->makeComponent(ComponentStatus::Draft);

        // Lo ve su autor, pero un borrador no está expuesto a nadie: contarlo
        // ensuciaría la métrica con actividad privada.
        $this->actingAs($component->author)
            ->getJson("/api/components/{$component->slug}")
            ->assertOk();

        $this->assertDatabaseCount('component_views', 0);
    }

    // --- Resumen ----------------------------------------------------------

    public function test_the_summary_reports_users_and_components(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->author()->count(2)->create();
        User::factory()->unverified()->create();

        $this->makeComponent(ComponentStatus::Published);
        $this->makeComponent(ComponentStatus::Draft);
        $this->makeComponent(ComponentStatus::PendingReview);

        $response = $this->actingAs($admin)->getJson('/api/admin/metrics')->assertOk();

        // 1 admin + 2 autores + 1 sin verificar + 3 autores de los componentes.
        $response->assertJsonPath('data.users.roles.admin', 1);
        $response->assertJsonPath('data.users.unverified', 1);
        $response->assertJsonPath('data.components.total', 3);
        $response->assertJsonPath('data.components.statuses.published', 1);
        $response->assertJsonPath('data.components.statuses.draft', 1);
        // Los estados sin filas llegan a cero, no ausentes.
        $response->assertJsonPath('data.components.statuses.rejected', 0);
    }

    public function test_the_summary_adds_up_downloads_and_views(): void
    {
        $admin = User::factory()->admin()->create();
        $component = $this->makeComponent(ComponentStatus::Published);
        $component->forceFill(['downloads' => 7])->save();

        $this->getJson("/api/components/{$component->slug}")->assertOk();
        $this->getJson("/api/components/{$component->slug}")->assertOk();

        $this->actingAs($admin)->getJson('/api/admin/metrics')
            ->assertOk()
            ->assertJsonPath('data.components.downloads', 7)
            ->assertJsonPath('data.activity.views_total', 2);
    }

    public function test_the_top_lists_are_ordered_by_interest(): void
    {
        $admin = User::factory()->admin()->create();
        $poco = $this->makeComponent(ComponentStatus::Published, 'El menos visto');
        $mucho = $this->makeComponent(ComponentStatus::Published, 'El mas visto');

        $this->getJson("/api/components/{$poco->slug}")->assertOk();
        foreach (range(1, 4) as $_) {
            $this->getJson("/api/components/{$mucho->slug}")->assertOk();
        }

        $this->actingAs($admin)->getJson('/api/admin/metrics')
            ->assertOk()
            ->assertJsonPath('data.top_components.0.title', 'El mas visto')
            ->assertJsonPath('data.top_components.0.views', 4)
            ->assertJsonPath('data.top_components.1.title', 'El menos visto');
    }

    public function test_the_daily_series_groups_views_by_day(): void
    {
        $admin = User::factory()->admin()->create();
        $component = $this->makeComponent(ComponentStatus::Published);

        $this->getJson("/api/components/{$component->slug}")->assertOk();

        $this->actingAs($admin)->getJson('/api/admin/metrics')
            ->assertOk()
            ->assertJsonPath('data.activity.daily_views.'.now()->toDateString(), 1);
    }

    private function makeComponent(ComponentStatus $status, string $title = 'Stat Counter Card'): Component
    {
        $category = Category::create([
            'name' => 'Cards y layout',
            'slug' => 'cards-y-layout-'.uniqid(),
            'stack' => 'all',
        ]);

        $component = new Component([
            'title' => $title,
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
