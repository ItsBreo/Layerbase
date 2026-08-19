<?php

namespace Tests\Feature\Notification;

use App\Enums\ComponentFileType;
use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use App\Notifications\ComponentApproved;
use App\Notifications\ComponentRejected;
use App\Notifications\ComponentSubmitted;
use App\Notifications\ReviewReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Notificaciones in-app.
 *
 * Cubren el agujero de producto que dejaba la moderación: un autor enviaba un
 * componente a revisión y **no se enteraba nunca** de si se lo habían aprobado
 * o rechazado, salvo que volviera a mirar por su cuenta.
 *
 * Lo que más importa aquí es a QUIÉN llega cada una: notificar al equivocado es
 * peor que no notificar.
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    // --- A quién llega cada una -------------------------------------------

    public function test_submitting_notifies_every_active_admin(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $otro = User::factory()->admin()->create();
        // Un admin suspendido no puede entrar: notificarle sería escribir a un
        // buzón que nadie abre.
        $suspendido = User::factory()->admin()->create([
            'banned' => true,
            'ban_reason' => 'Cuenta comprometida.',
        ]);

        $component = $this->draftWithSource();

        $this->actingAs($component->author)
            ->postJson("/api/components/{$component->slug}/submit")
            ->assertOk();

        Notification::assertSentTo([$admin, $otro], ComponentSubmitted::class);
        Notification::assertNotSentTo($suspendido, ComponentSubmitted::class);
    }

    public function test_approving_notifies_the_author_and_nobody_else(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $component = $this->pendingComponent();

        $this->actingAs($admin)
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertOk();

        Notification::assertSentTo($component->author, ComponentApproved::class);
        // Quien aprueba no necesita que le avisen de lo que acaba de hacer.
        Notification::assertNotSentTo($admin, ComponentApproved::class);
    }

    public function test_rejecting_notifies_the_author_with_the_reason(): void
    {
        Notification::fake();

        $component = $this->pendingComponent();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/reject", [
                'reason' => 'El README no documenta las props del componente.',
            ])
            ->assertOk();

        Notification::assertSentTo(
            $component->author,
            ComponentRejected::class,
            function (ComponentRejected $notification) use ($component) {
                $payload = $notification->toArray($component->author);

                // El motivo viaja DENTRO del aviso: es la información por la que
                // el autor va a entrar, y así se ahorra el viaje a la ficha.
                return $payload['reason'] === 'El README no documenta las props del componente.';
            },
        );
    }

    public function test_a_new_review_notifies_the_component_author(): void
    {
        Notification::fake();

        $component = $this->publishedComponent();
        $reviewer = User::factory()->create();

        $this->actingAs($reviewer)
            ->postJson("/api/components/{$component->slug}/reviews", [
                'rating' => 5,
                'body' => 'Me ha resuelto justo lo que necesitaba, muy bien documentado.',
            ])
            ->assertCreated();

        Notification::assertSentTo($component->author, ReviewReceived::class);
        // A quien escribe la reseña no se le notifica su propia reseña.
        Notification::assertNotSentTo($reviewer, ReviewReceived::class);
    }

    // --- Listado y lectura ------------------------------------------------

    public function test_a_user_only_sees_their_own_notifications(): void
    {
        $component = $this->pendingComponent();
        $ajeno = User::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertOk();

        $this->actingAs($component->author)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'component_approved')
            ->assertJsonPath('data.0.component_title', $component->title);

        // La notificación de otro no aparece por ningún lado.
        $this->actingAs($ajeno)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_a_guest_has_no_notifications_endpoint(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
    }

    public function test_the_unread_counter_drops_when_marking_as_read(): void
    {
        $component = $this->pendingComponent();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertOk();

        $author = $component->author;

        $this->actingAs($author)->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread', 1);

        $id = $author->notifications()->first()->id;

        $this->actingAs($author)->postJson("/api/notifications/{$id}/read")->assertOk();

        $this->actingAs($author)->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread', 0);
    }

    public function test_nobody_can_mark_someone_elses_notification(): void
    {
        $component = $this->pendingComponent();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/components/{$component->slug}/approve")
            ->assertOk();

        $id = $component->author->notifications()->first()->id;

        // 404 y no 403: el id de otro simplemente no existe dentro de tus
        // notificaciones, que es lo único sobre lo que se opera.
        $this->actingAs(User::factory()->create())
            ->postJson("/api/notifications/{$id}/read")
            ->assertNotFound();
    }

    public function test_marking_all_as_read_clears_the_counter(): void
    {
        $author = User::factory()->author()->create();

        foreach (range(1, 3) as $_) {
            $component = $this->pendingComponent();
            $component->forceFill(['user_id' => $author->id])->save();

            $this->actingAs(User::factory()->admin()->create())
                ->postJson("/api/admin/components/{$component->slug}/approve")
                ->assertOk();
        }

        $this->actingAs($author)->getJson('/api/notifications/unread-count')
            ->assertJsonPath('unread', 3);

        $this->actingAs($author)->postJson('/api/notifications/read-all')->assertOk();

        $this->actingAs($author)->getJson('/api/notifications/unread-count')
            ->assertJsonPath('unread', 0);
    }

    // --- Helpers ----------------------------------------------------------

    private function makeComponent(ComponentStatus $status): Component
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

    private function pendingComponent(): Component
    {
        return $this->makeComponent(ComponentStatus::PendingReview);
    }

    private function publishedComponent(): Component
    {
        return $this->makeComponent(ComponentStatus::Published);
    }

    /** Borrador con código: `submit` lo exige. */
    private function draftWithSource(): Component
    {
        $component = $this->makeComponent(ComponentStatus::Draft);

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
