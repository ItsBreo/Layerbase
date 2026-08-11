<?php

namespace App\Http\Controllers\Api\Component;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Http\Controllers\Controller;
use App\Http\Requests\Component\StoreComponentRequest;
use App\Http\Requests\Component\UpdateComponentRequest;
use App\Http\Resources\ComponentResource;
use App\Models\Component;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

/**
 * CRUD público y de autor de componentes (Módulo 3).
 *
 * El listado y el detalle son públicos y solo muestran componentes publicados
 * (salvo al propio autor). La creación/edición/borrado exigen autenticación y
 * pasan por ComponentPolicy.
 */
class ComponentController extends Controller
{
    /**
     * GET /components — listado público con filtros, orden y paginación.
     * Solo componentes publicados.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        // `files` se carga para poder resolver la portada (preview_url) de cada
        // tarjeta sin una query por componente.
        $query = Component::query()
            ->published()
            ->with(['author', 'category', 'tags', 'files']);

        $this->applyFilters($query, $request);
        $this->applySorting($query, $request);

        $perPage = min((int) $request->integer('per_page', 15), 50);

        return ComponentResource::collection($query->paginate($perPage));
    }

    /**
     * GET /components/{component} — detalle. Público si está publicado; si no,
     * solo el autor (o admin) puede verlo. Expone archivos, nunca el source.
     */
    public function show(Request $request, Component $component): ComponentResource
    {
        // Un componente no publicado solo lo ve su autor/admin.
        if (! $component->isPublished()) {
            $this->authorize('view', $component);
        }

        $component->load(['author', 'category', 'tags', 'files']);

        return new ComponentResource($component);
    }

    /**
     * POST /components — crea un componente en estado `draft` a nombre del
     * usuario autenticado.
     */
    public function store(StoreComponentRequest $request): JsonResponse
    {
        $this->authorize('create', Component::class);

        $component = new Component($request->safe()->except('tags'));
        // El autor es siempre el usuario autenticado, nunca input del body.
        $component->user_id = $request->user()->id;
        $component->status = ComponentStatus::Draft;
        $component->save();

        $this->syncTags($component, $request->input('tags', []));

        $component->load(['author', 'category', 'tags', 'files']);

        return (new ComponentResource($component))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * PATCH /components/{component} — edición parcial. La policy garantiza
     * propiedad y que el estado sea editable (no publicado / en revisión).
     */
    public function update(UpdateComponentRequest $request, Component $component): ComponentResource
    {
        $this->authorize('update', $component);

        $component->fill($request->safe()->except('tags'));
        $component->save();

        if ($request->has('tags')) {
            $this->syncTags($component, $request->input('tags', []));
        }

        $component->load(['author', 'category', 'tags', 'files']);

        return new ComponentResource($component);
    }

    /**
     * DELETE /components/{component} — borra el componente. Si ya tiene compras
     * no se elimina (hay clientes que pagaron): se despublica en su lugar.
     * En cualquier otro caso, soft delete.
     */
    public function destroy(Component $component): JsonResponse
    {
        $this->authorize('delete', $component);

        if ($component->hasPurchases()) {
            $component->unpublish();

            return response()->json([
                'message' => 'El componente tiene compras y no puede eliminarse; se ha despublicado.',
                'data' => new ComponentResource($component),
            ]);
        }

        $component->delete();

        return response()->json(null, 204);
    }

    /**
     * GET /components/my — componentes del autor autenticado (todos los
     * estados), opcionalmente filtrados por `status`.
     */
    public function my(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->components()
            ->with(['category', 'tags', 'files'])
            ->latest();

        if ($request->filled('status')) {
            $request->validate([
                'status' => ['string', \Illuminate\Validation\Rule::enum(ComponentStatus::class)],
            ]);
            $query->where('status', $request->input('status'));
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);

        return ComponentResource::collection($query->paginate($perPage));
    }

    // --- Helpers ----------------------------------------------------------

    /** Aplica los filtros del listado público al query builder. */
    private function applyFilters(Builder $query, Request $request): void
    {
        // Stack.
        if ($request->filled('stack') && in_array($request->input('stack'), Stack::values(), true)) {
            $query->where('stack', $request->input('stack'));
        }

        // Categoría por id o por slug.
        if ($request->filled('category')) {
            $category = $request->input('category');
            $query->whereHas('category', function (Builder $q) use ($category): void {
                is_numeric($category)
                    ? $q->where('id', $category)
                    : $q->where('slug', $category);
            });
        }

        // Tag por slug.
        if ($request->filled('tag')) {
            $tag = $request->input('tag');
            $query->whereHas('tags', fn (Builder $q) => $q->where('slug', $tag));
        }

        // Solo gratuitos / solo de pago.
        if ($request->boolean('free')) {
            $query->where('price', 0);
        } elseif ($request->boolean('paid')) {
            $query->where('price', '>', 0);
        }

        // Rango de precio.
        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->input('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->input('max_price'));
        }

        // Búsqueda de texto en título/descripción.
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\%', '\_'], (string) $request->input('q')).'%';
            $query->where(function (Builder $q) use ($term): void {
                $q->where('title', 'like', $term)
                    ->orWhere('description', 'like', $term);
            });
        }
    }

    /**
     * Ordenación del listado. Por defecto, cronológico ASCENDENTE (lo más
     * antiguo publicado primero), que es el orden de la vista principal tipo
     * Pinterest. El desempate por `id` estabiliza la paginación cuando varios
     * componentes comparten `published_at`.
     */
    private function applySorting(Builder $query, Request $request): void
    {
        match ($request->input('sort')) {
            'newest' => $query->orderByDesc('published_at')->orderByDesc('id'),
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'rating' => $query->orderByDesc('rating_avg'),
            'downloads' => $query->orderByDesc('downloads'),
            'oldest' => $query->orderBy('published_at')->orderBy('id'),
            // Por defecto, lo más reciente primero: es lo que espera quien entra
            // a un marketplace sin filtrar nada.
            default => $query->orderByDesc('published_at')->orderByDesc('id'),
        };
    }

    /**
     * Sincroniza los tags (por nombre) del componente: resuelve o crea cada
     * tag por su slug y ajusta el pivote de golpe.
     *
     * @param  array<int, string>  $names
     */
    private function syncTags(Component $component, array $names): void
    {
        $ids = collect($names)
            ->map(fn (string $name) => trim($name))
            ->filter()
            ->unique()
            ->map(function (string $name): int {
                return Tag::firstOrCreate(
                    ['slug' => Str::slug($name)],
                    ['name' => $name],
                )->id;
            });

        $component->tags()->sync($ids);
    }
}
