<?php

namespace Tests\Feature\Component;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Valoraciones de componentes.
 *
 * Lo que se protege aquí es que la nota signifique algo. Tres reglas la
 * sostienen: nadie valora su propio componente, una persona opina una sola vez,
 * y lo que se oculta del público deja de contar para la media.
 */
class ReviewTest extends TestCase
{
    use RefreshDatabase;

    // --- Quién puede valorar ---------------------------------------------

    public function test_a_verified_user_can_review_a_published_component(): void
    {
        $component = $this->makeComponent();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/components/{$component->slug}/reviews", [
                'rating' => 4,
                'body' => 'Funciona bien y el README explica las props con claridad.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.rating', 4);
    }

    public function test_an_author_cannot_review_their_own_component(): void
    {
        $component = $this->makeComponent();

        // Sin esta regla, un autor se pone cinco estrellas y la nota deja de
        // significar nada.
        $this->actingAs($component->author)
            ->postJson("/api/components/{$component->slug}/reviews", [
                'rating' => 5,
                'body' => 'Mi propio componente es sencillamente magnifico.',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_an_unverified_user_cannot_review(): void
    {
        $component = $this->makeComponent();

        $this->actingAs(User::factory()->unverified()->create())
            ->postJson("/api/components/{$component->slug}/reviews", [
                'rating' => 5,
                'body' => 'Escribo esto sin haber verificado mi correo.',
            ])
            ->assertForbidden();
    }

    public function test_an_unpublished_component_cannot_be_reviewed(): void
    {
        $component = $this->makeComponent(ComponentStatus::Draft);

        $this->actingAs(User::factory()->create())
            ->postJson("/api/components/{$component->slug}/reviews", [
                'rating' => 3,
                'body' => 'Un borrador no lo ha visto nadie todavia.',
            ])
            ->assertForbidden();
    }

    public function test_a_guest_cannot_review(): void
    {
        $component = $this->makeComponent();

        $this->postJson("/api/components/{$component->slug}/reviews", [
            'rating' => 5,
            'body' => 'Soy un invitado y no deberia poder valorar.',
        ])->assertUnauthorized();
    }

    public function test_a_user_can_only_review_a_component_once(): void
    {
        $component = $this->makeComponent();
        $user = User::factory()->create();
        $payload = ['rating' => 4, 'body' => 'Una valoracion perfectamente valida y larga.'];

        $this->actingAs($user)->postJson("/api/components/{$component->slug}/reviews", $payload)
            ->assertCreated();

        // La clave única ya lo impediría, pero con un error ilegible: se avisa
        // de que lo que toca es editar la suya.
        $this->actingAs($user)->postJson("/api/components/{$component->slug}/reviews", $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('review');

        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_a_short_review_is_refused(): void
    {
        $component = $this->makeComponent();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/components/{$component->slug}/reviews", ['rating' => 1, 'body' => 'Malo'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('body');
    }

    public function test_the_rating_must_be_between_one_and_five(): void
    {
        $component = $this->makeComponent();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/components/{$component->slug}/reviews", [
                'rating' => 9,
                'body' => 'Le pongo un nueve porque me ha gustado mucho.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rating');
    }

    // --- Editar y borrar --------------------------------------------------

    public function test_only_its_author_can_edit_a_review(): void
    {
        $review = $this->review($this->makeComponent(), 5);

        $this->actingAs(User::factory()->create())
            ->patchJson("/api/reviews/{$review->id}", ['rating' => 1])
            ->assertForbidden();

        // Ni siquiera un admin: cambiar las palabras de otro no es moderar.
        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/reviews/{$review->id}", ['rating' => 1])
            ->assertForbidden();

        $this->actingAs($review->author)
            ->patchJson("/api/reviews/{$review->id}", ['rating' => 2])
            ->assertOk()
            ->assertJsonPath('data.rating', 2);
    }

    public function test_an_admin_can_withdraw_a_review(): void
    {
        $review = $this->review($this->makeComponent(), 5);

        $this->actingAs(User::factory()->admin()->create())
            ->deleteJson("/api/reviews/{$review->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('reviews', ['id' => $review->id]);
    }

    // --- Reportes ---------------------------------------------------------

    public function test_a_reported_review_disappears_from_the_public_listing(): void
    {
        $component = $this->makeComponent();
        $review = $this->review($component, 5);

        $this->getJson("/api/components/{$component->slug}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs(User::factory()->create())
            ->postJson("/api/reviews/{$review->id}/report", [
                'reason' => 'Contiene insultos hacia el autor del componente.',
            ])
            ->assertOk();

        // Se oculta ya, sin esperar a que un admin la mire: si el reporte es
        // falso se restaura y no ha pasado nada; al revés, el abuso se queda
        // publicado mientras tanto.
        $this->getJson("/api/components/{$component->slug}/reviews")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_nobody_can_report_their_own_review(): void
    {
        $review = $this->review($this->makeComponent(), 3);

        $this->actingAs($review->author)
            ->postJson("/api/reviews/{$review->id}/report", [
                'reason' => 'Me reporto a mi mismo para probar el limite.',
            ])
            ->assertForbidden();
    }

    // --- La nota del componente -------------------------------------------

    public function test_the_component_rating_reflects_its_reviews(): void
    {
        $component = $this->makeComponent();

        // Sin valoraciones la media es NULL, no 0: un 0 se leería como
        // "valorado pésimo" en vez de "todavía sin valorar".
        $this->assertNull($component->rating_avg);
        $this->assertSame(0, $component->rating_count);

        $this->review($component, 5);
        $this->review($component, 3);

        $component->refresh();
        $this->assertSame(2, $component->rating_count);
        $this->assertSame('4.00', $component->rating_avg);
    }

    public function test_editing_a_review_moves_the_average(): void
    {
        $component = $this->makeComponent();
        $review = $this->review($component, 5);

        $review->update(['rating' => 1]);

        $this->assertSame('1.00', $component->fresh()->rating_avg);
    }

    public function test_a_reported_review_stops_counting_towards_the_average(): void
    {
        $component = $this->makeComponent();
        $this->review($component, 5);
        $reported = $this->review($component, 1);

        $this->assertSame('3.00', $component->fresh()->rating_avg);

        $reported->report('Insultos hacia el autor del componente.');

        // Lo que se oculta del público deja de mover la nota pública: ocultarla
        // a medias sería peor que no ocultarla.
        $component->refresh();
        $this->assertSame('5.00', $component->rating_avg);
        $this->assertSame(1, $component->rating_count);
    }

    public function test_withdrawing_the_last_review_leaves_the_rating_empty(): void
    {
        $component = $this->makeComponent();
        $review = $this->review($component, 4);

        $review->delete();

        $component->refresh();
        $this->assertNull($component->rating_avg);
        $this->assertSame(0, $component->rating_count);
    }

    // --- Helpers ----------------------------------------------------------

    private function makeComponent(ComponentStatus $status = ComponentStatus::Published): Component
    {
        $category = Category::create(['name' => 'Cards '.uniqid(), 'stack' => 'all']);

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

    private function review(Component $component, int $rating): Review
    {
        $review = new Review([
            'rating' => $rating,
            'body' => 'Una valoracion con longitud suficiente para pasar la validacion.',
        ]);
        $review->component_id = $component->id;
        $review->user_id = User::factory()->create()->id;
        $review->save();

        return $review;
    }
}
