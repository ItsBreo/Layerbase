<?php

namespace App\Http\Controllers\Api\Component;

use App\Enums\ComponentFileType;
use App\Enums\ComponentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Component\RejectComponentRequest;
use App\Http\Resources\ComponentResource;
use App\Models\Component;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Máquina de estados de moderación de un componente.
 *
 * Las transiciones legales viven en ComponentStatus::allowedTransitions(); este
 * controlador solo orquesta cada paso (autorización, precondiciones, efectos
 * secundarios como notificar al admin o fijar published_at). Uno de los tres
 * riesgos marcados por la hoja de ruta: se valida cada transición explícitamente.
 */
class ComponentStateController extends Controller
{
    /**
     * POST /components/{component}/submit — draft → pending_review.
     * Requiere que el componente tenga, al menos, código fuente subido.
     */
    public function submit(Component $component): JsonResponse
    {
        $this->authorize('submit', $component);

        $this->assertCanTransition($component, ComponentStatus::PendingReview);

        // Precondición de negocio: no se puede pedir revisión de algo vacío.
        if ($component->fileOfType(ComponentFileType::Source) === null) {
            throw ValidationException::withMessages([
                'source' => ['Debes subir el código fuente antes de enviar a revisión.'],
            ]);
        }

        $component->submitForReview();

        // TODO(notificaciones): notificar a los admin de que hay un componente
        // pendiente de revisar (módulo de notificaciones, semana posterior).

        return $this->respond($component, 'Componente enviado a revisión.');
    }

    /**
     * POST /admin/components/{component}/approve — pending_review → published.
     *
     * Único camino por el que un componente se hace visible en el marketplace.
     * Reservado a admin (policy `moderate`): que el autor pueda pedir revisión
     * pero no aprobarse es justo la razón de que `submit` y `approve` sean dos
     * endpoints distintos.
     */
    public function approve(Component $component): JsonResponse
    {
        $this->authorize('moderate', $component);

        $this->assertCanTransition($component, ComponentStatus::Published);

        $component->approve();

        // TODO(notificaciones): avisar al autor de que su componente está
        // publicado (módulo de notificaciones, semana posterior).

        return $this->respond($component, 'Componente aprobado y publicado.');
    }

    /**
     * POST /admin/components/{component}/reject — pending_review → rejected.
     * El motivo es obligatorio (ver RejectComponentRequest).
     */
    public function reject(RejectComponentRequest $request, Component $component): JsonResponse
    {
        $this->authorize('moderate', $component);

        $this->assertCanTransition($component, ComponentStatus::Rejected);

        $component->reject($request->validated('reason'));

        // TODO(notificaciones): avisar al autor del rechazo y del motivo.

        return $this->respond($component, 'Componente rechazado.');
    }

    /**
     * POST /components/{component}/unpublish — published → unpublished.
     * Deja de estar visible en el marketplace pero conserva su historial.
     */
    public function unpublish(Component $component): JsonResponse
    {
        $this->authorize('unpublish', $component);

        $this->assertCanTransition($component, ComponentStatus::Unpublished);

        $component->unpublish();

        return $this->respond($component, 'Componente despublicado.');
    }

    /**
     * POST /components/{component}/revert — rejected|unpublished → draft.
     *
     * Cierra el ciclo: desde `rejected` el enum solo permite volver a borrador,
     * así que sin este paso un componente rechazado quedaría atrapado sin
     * manera de reenviarlo a revisión.
     */
    public function revert(Component $component): JsonResponse
    {
        $this->authorize('revert', $component);

        $this->assertCanTransition($component, ComponentStatus::Draft);

        $component->revertToDraft();

        return $this->respond($component, 'Componente devuelto a borrador.');
    }

    /**
     * Garantiza que la transición solicitada es legal desde el estado actual.
     * Fuente de verdad única: el enum. Un salto ilegal es un 422, no un 500.
     */
    private function assertCanTransition(Component $component, ComponentStatus $target): void
    {
        if (! $component->status->canTransitionTo($target)) {
            throw ValidationException::withMessages([
                'status' => [
                    "No se puede pasar de '{$component->status->value}' a '{$target->value}'.",
                ],
            ]);
        }
    }

    private function respond(Component $component, string $message): JsonResponse
    {
        $component->load(['author', 'category', 'tags', 'files']);

        return response()->json([
            'message' => $message,
            'data' => new ComponentResource($component),
        ]);
    }
}
