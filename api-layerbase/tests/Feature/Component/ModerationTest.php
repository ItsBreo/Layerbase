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
 * Moderación de componentes: aprobar, rechazar y volver a borrador.
 *
 * Lo que se protege aquí es la separación entre pedir revisión y resolverla.
 * `submit` lo ejecuta el autor; `approve` solo un admin. Si un autor pudiera
 * aprobarse, la moderación no existiría — de ahí que la mitad de estos casos
 * sean intentos de saltarse ese muro.
 *
 * El segundo bloque cubre el ciclo completo: un rechazo tiene que dejar camino
 * de vuelta a `draft`, o el componente queda atrapado.
 */
class ModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    // --- Aprobar ----------------------------------------------------------

    public function test_an_admin_publishes_a_component_by_approving_it(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', ComponentStatus::Published->value);

        $component->refresh();
        $this->assertSame(ComponentStatus::Published, $component->status);
        // published_at se fija al aprobar: es la fecha por la que ordena el
        // marketplace, así que no puede quedarse en null.
        $this->assertNotNull($component->published_at);
    }

    public function test_an_approved_component_shows_up_in_the_public_listing(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        // Antes de aprobar no es visible para nadie.
        $this->getJson('/api/components')->assertOk()->assertJsonCount(0, 'data');

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertOk();

        $this->getJson('/api/components')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', $component->slug);
    }

    public function test_the_author_cannot_approve_their_own_component(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        // El muro que justifica que submit y approve sean endpoints distintos.
        $this->actingAs($component->author)
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertForbidden();

        $this->assertSame(ComponentStatus::PendingReview, $component->fresh()->status);
    }

    public function test_a_guest_cannot_approve_a_component(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        $this->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertUnauthorized();
    }

    public function test_a_draft_cannot_be_approved_without_passing_through_review(): void
    {
        $component = $this->makeComponent(ComponentStatus::Draft);

        // Saltarse pending_review es una transición ilegal, no un 500.
        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    // --- Rechazar ---------------------------------------------------------

    public function test_an_admin_rejects_a_component_with_a_reason(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/reject", [
                'reason' => 'El README no documenta las props del componente.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', ComponentStatus::Rejected->value);

        $this->assertSame(
            'El README no documenta las props del componente.',
            $component->fresh()->rejection_reason,
        );
    }

    public function test_a_rejection_without_a_reason_is_refused(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        // Un rechazo mudo deja al autor sin nada que corregir.
        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');

        $this->assertSame(ComponentStatus::PendingReview, $component->fresh()->status);
    }

    public function test_the_author_cannot_reject_a_component(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);

        $this->actingAs($component->author)
            ->postJson("/api/admin/components/{$component->slug}/reject", [
                'reason' => 'Me rechazo a mí mismo para probar el muro.',
            ])
            ->assertForbidden();
    }

    public function test_the_author_sees_the_rejection_reason_but_a_stranger_does_not(): void
    {
        $component = $this->makeComponent(ComponentStatus::Rejected);
        $component->rejection_reason = 'Faltan ejemplos de uso.';
        $component->save();

        // El detalle NO va envuelto en `data`: AppServiceProvider llama a
        // JsonResource::withoutWrapping(). Los endpoints de acción sí lo tienen
        // porque lo montan a mano junto al `message`.
        $this->actingAs($component->author)
            ->getJson("/api/components/{$component->slug}")
            ->assertOk()
            ->assertJsonPath('rejection_reason', 'Faltan ejemplos de uso.');

        // Un tercero ni siquiera ve el componente (no está publicado), así que
        // el motivo no se filtra por ninguna vía.
        $this->actingAs(User::factory()->create())
            ->getJson("/api/components/{$component->slug}")
            ->assertForbidden();
    }

    // --- Vuelta a borrador ------------------------------------------------

    public function test_a_rejected_component_can_go_back_to_draft_and_be_resubmitted(): void
    {
        $component = $this->makeComponent(ComponentStatus::PendingReview);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson("/api/admin/components/{$component->slug}/reject", [
                'reason' => 'Faltan ejemplos de uso en el README.',
            ])->assertOk();

        // Sin este paso el componente quedaría atrapado: desde `rejected` el
        // enum solo permite volver a borrador, y `submit` exige `draft`.
        $this->actingAs($component->author)
            ->postJson("/api/components/{$component->slug}/revert")
            ->assertOk()
            ->assertJsonPath('data.status', ComponentStatus::Draft->value);

        // El motivo sigue visible mientras corrige.
        $this->assertNotNull($component->fresh()->rejection_reason);

        $this->actingAs($component->author)
            ->postJson("/api/components/{$component->slug}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', ComponentStatus::PendingReview->value);

        // Al reenviar, el motivo anterior deja de aplicar.
        $this->assertNull($component->fresh()->rejection_reason);
    }

    public function test_a_stranger_cannot_revert_someone_elses_component(): void
    {
        $component = $this->makeComponent(ComponentStatus::Rejected);

        $this->actingAs(User::factory()->create())
            ->postJson("/api/components/{$component->slug}/revert")
            ->assertForbidden();
    }

    // --- Cola de revisión -------------------------------------------------

    public function test_the_queue_lists_pending_components_oldest_first(): void
    {
        $old = $this->makeComponent(ComponentStatus::PendingReview, title: 'El que lleva más esperando');
        $new = $this->makeComponent(ComponentStatus::PendingReview, title: 'El recién llegado');

        // Una cola se atiende por antigüedad, o lo viejo nunca sube.
        $old->forceFill(['updated_at' => now()->subDays(3)])->saveQuietly();

        $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/admin/components')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', $old->slug)
            ->assertJsonPath('data.1.slug', $new->slug);
    }

    public function test_the_queue_only_returns_the_requested_status(): void
    {
        $this->makeComponent(ComponentStatus::PendingReview);
        $this->makeComponent(ComponentStatus::Draft);

        // Por defecto, solo lo que está esperando revisión.
        $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/admin/components')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', ComponentStatus::PendingReview->value);

        $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/admin/components?status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', ComponentStatus::Draft->value);
    }

    public function test_a_non_admin_cannot_read_the_queue(): void
    {
        $this->makeComponent(ComponentStatus::PendingReview);

        $this->actingAs(User::factory()->author()->create())
            ->getJson('/api/admin/components')
            ->assertForbidden();
    }

    public function test_the_counts_endpoint_returns_every_status(): void
    {
        $this->makeComponent(ComponentStatus::PendingReview);
        $this->makeComponent(ComponentStatus::PendingReview);
        $this->makeComponent(ComponentStatus::Draft);

        $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/admin/components/counts')
            ->assertOk()
            ->assertJsonPath('data.pending_review', 2)
            ->assertJsonPath('data.draft', 1)
            // Los estados sin filas llegan a cero, no ausentes: el frontend no
            // debería tener que distinguir los dos casos.
            ->assertJsonPath('data.published', 0)
            ->assertJsonPath('data.rejected', 0)
            ->assertJsonPath('data.unpublished', 0);
    }

    /** Componente de un autor nuevo, en el estado pedido y con su source. */
    private function makeComponent(
        ComponentStatus $status,
        string $title = 'Stat Counter Card',
    ): Component {
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

        // `submit` exige código fuente, así que todo componente de estos tests
        // lo tiene: si no, el reenvío del ciclo completo fallaría por otra razón.
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
