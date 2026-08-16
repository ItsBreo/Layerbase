<?php

namespace Tests\Feature\Profile;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Perfil público de un autor.
 *
 * Lo que se protege aquí es la privacidad del resumen: `stats_public` nace en
 * false y publicarlo es una decisión activa del autor. Su dueño y los admin lo
 * ven siempre; un tercero solo si está publicado.
 *
 * Hasta ahora la columna, el conmutador del dashboard y la rama de
 * `UserResource` existían sin que nadie pudiera llegar a verlos.
 */
class PublicProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_can_see_a_public_profile(): void
    {
        $author = User::factory()->author()->create(['name' => 'Ada Lovelace']);

        $this->getJson("/api/users/{$author->id}")
            ->assertOk()
            ->assertJsonPath('name', 'Ada Lovelace')
            // Los datos internos siguen sin salir (ver UserResourcePrivacyTest).
            ->assertJsonMissingPath('email');
    }

    public function test_the_summary_is_hidden_from_strangers_by_default(): void
    {
        $author = $this->authorWithPublishedComponent();

        // stats_public nace en false: publicarlo es una decisión activa.
        $this->getJson("/api/users/{$author->id}")
            ->assertOk()
            ->assertJsonMissingPath('stats');
    }

    public function test_the_summary_is_visible_once_published(): void
    {
        $author = $this->authorWithPublishedComponent();
        $author->forceFill(['stats_public' => true])->save();

        $this->getJson("/api/users/{$author->id}")
            ->assertOk()
            ->assertJsonPath('stats.components', 1);
    }

    public function test_the_owner_always_sees_their_own_summary(): void
    {
        $author = $this->authorWithPublishedComponent();

        $this->actingAs($author)
            ->getJson("/api/users/{$author->id}")
            ->assertOk()
            ->assertJsonPath('stats.components', 1);
    }

    public function test_an_admin_always_sees_the_summary(): void
    {
        $author = $this->authorWithPublishedComponent();

        $this->actingAs(User::factory()->admin()->create())
            ->getJson("/api/users/{$author->id}")
            ->assertOk()
            ->assertJsonPath('stats.components', 1);
    }

    public function test_a_suspended_account_has_no_public_profile(): void
    {
        $author = User::factory()->author()->create([
            'banned' => true,
            'ban_reason' => 'Sube componentes plagiados.',
        ]);

        // 404 y no 403: que exista la cuenta de alguien suspendido no es algo
        // que haya que confirmarle a un desconocido.
        $this->getJson("/api/users/{$author->id}")->assertNotFound();
        $this->getJson("/api/users/{$author->id}/components")->assertNotFound();
    }

    // --- Componentes del autor -------------------------------------------

    public function test_the_listing_only_returns_published_components(): void
    {
        $author = $this->authorWithPublishedComponent();
        $this->componentFor($author, ComponentStatus::Draft);
        $this->componentFor($author, ComponentStatus::PendingReview);

        $this->getJson("/api/users/{$author->id}/components")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', ComponentStatus::Published->value);
    }

    public function test_the_author_does_not_see_their_drafts_here_either(): void
    {
        $author = $this->authorWithPublishedComponent();
        $this->componentFor($author, ComponentStatus::Draft);

        // Esta es la vista pública: el autor tiene que ver exactamente lo mismo
        // que ve un visitante. Sus borradores están en /components/my.
        $this->actingAs($author)
            ->getJson("/api/users/{$author->id}/components")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_it_returns_404_for_an_unknown_user(): void
    {
        $this->getJson('/api/users/999999')->assertNotFound();
    }

    // --- Helpers ----------------------------------------------------------

    private function authorWithPublishedComponent(): User
    {
        $author = User::factory()->author()->create();
        $this->componentFor($author, ComponentStatus::Published);

        return $author;
    }

    private function componentFor(User $author, ComponentStatus $status): Component
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
        $component->user_id = $author->id;
        $component->status = $status;
        $component->published_at = $status === ComponentStatus::Published ? now() : null;
        $component->save();

        return $component;
    }
}
