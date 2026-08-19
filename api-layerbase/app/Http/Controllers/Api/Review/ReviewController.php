<?php

namespace App\Http\Controllers\Api\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Component;
use App\Models\Review;
use App\Notifications\ReviewReceived;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

/**
 * Valoraciones de un componente.
 *
 * El listado es público (con auth opcional, para poder marcar cuál es la tuya);
 * escribir exige sesión y pasar por `ReviewPolicy`.
 *
 * La nota del componente (`rating_avg`, `rating_count`) NO se toca aquí: la
 * mantiene `ReviewObserver`. Si se actualizara a mano en cada endpoint, cada
 * camino nuevo tendría que acordarse de hacerlo.
 */
class ReviewController extends Controller
{
    /**
     * GET /components/{component}/reviews — las visibles, más recientes primero.
     *
     * Las reportadas se ocultan: siguen contando para la moderación, no para
     * quien está decidiendo si se descarga el componente.
     */
    public function index(Component $component): AnonymousResourceCollection
    {
        $reviews = $component->reviews()
            ->visible()
            ->with('author')
            ->latest()
            ->paginate(10);

        return ReviewResource::collection($reviews);
    }

    /** POST /components/{component}/reviews */
    public function store(StoreReviewRequest $request, Component $component): JsonResponse
    {
        $this->authorize('create', [Review::class, $component]);

        // La clave única de la tabla ya lo impediría, pero con un error de
        // integridad ilegible: se comprueba antes para poder decir que ya
        // valoró este componente y que lo que toca es editar la suya.
        $existing = $component->reviews()->where('user_id', $request->user()->id)->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'review' => ['Ya has valorado este componente. Edita tu valoración.'],
            ]);
        }

        $review = new Review($request->validated());
        $review->component_id = $component->id;
        $review->user_id = $request->user()->id;
        $review->save();

        // Al autor del componente, no al de la reseña. `?->` porque la relación
        // es opcional en el tipo, aunque en la práctica siempre haya autor.
        $component->author?->notify(new ReviewReceived($review->load('component', 'author')));

        return response()->json([
            'message' => 'Valoración publicada.',
            'data' => new ReviewResource($review->load('author')),
        ], 201);
    }

    /** PATCH /reviews/{review} — solo su autor. */
    public function update(StoreReviewRequest $request, Review $review): JsonResponse
    {
        $this->authorize('update', $review);

        $review->fill($request->validated());
        $review->save();

        return response()->json([
            'message' => 'Valoración actualizada.',
            'data' => new ReviewResource($review->load('author')),
        ]);
    }

    /** DELETE /reviews/{review} — su autor, o un admin retirándola. */
    public function destroy(Review $review): JsonResponse
    {
        $this->authorize('delete', $review);

        $review->delete();

        return response()->json(null, 204);
    }

    /**
     * POST /reviews/{review}/report — la marca para revisión y la oculta.
     *
     * Se oculta en el acto, antes de que un admin la mire. Es la decisión
     * prudente: si el reporte es falso se restaura y no ha pasado nada, pero al
     * revés el abuso se queda publicado hasta que alguien lo vea.
     */
    public function report(Request $request, Review $review): JsonResponse
    {
        $this->authorize('report', $review);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $review->report($validated['reason']);

        return response()->json(['message' => 'Valoración reportada. Un administrador la revisará.']);
    }
}
