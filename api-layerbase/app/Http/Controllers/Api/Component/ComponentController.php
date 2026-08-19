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
use Illuminate\Validation\Rule;

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
        $term = trim((string) $request->input('q', ''));
        $perPage = min((int) $request->integer('per_page', 15), 50);

        if ($term === '') {
            $query = $this->baseQuery($request);
            $this->applySorting($query, $request);

            return ComponentResource::collection($query->paginate($perPage));
        }

        $results = $this->searchQuery($request, $term, fuzzy: false)->paginate($perPage);

        /*
         * Plan B: si la búsqueda exacta no ha encontrado NADA, se reintenta por
         * parecido. Así "carusel" acaba encontrando "Carousel" en vez de
         * devolver una página vacía.
         *
         * Se hace en cascada y no en un único `OR` a propósito. Mezclarlas en
         * una sola query obligaría a comparar trigramas en TODAS las búsquedas,
         * incluidas las que ya habían acertado, y metería resultados
         * medianamente parecidos entre los que son exactos. Aquí la búsqueda
         * difusa solo se paga cuando la buena ya ha fallado, que es justo cuando
         * el usuario prefiere algo aproximado a un "sin resultados".
         */
        $fuzzy = $results->total() === 0;

        if ($fuzzy) {
            $results = $this->searchQuery($request, $term, fuzzy: true)->paginate($perPage);
        }

        /*
         * Se dice por qué vía vinieron los resultados. Sin esto, quien busca
         * "carusel" recibe componentes que no contienen lo que ha escrito y no
         * hay forma de saber si el buscador ha entendido mal o si le está
         * ofreciendo lo más parecido. El frontend lo usa para avisar.
         */
        return ComponentResource::collection($results)->additional([
            'search' => [
                'term' => $term,
                'fuzzy' => $fuzzy && $results->total() > 0,
            ],
        ]);
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

        /*
         * Visita contabilizada solo si es una visita de verdad: el componente
         * está publicado y quien mira no es su autor.
         *
         * Excluir al autor no es un detalle: entra en su propia ficha
         * constantemente mientras la prepara, y sin este filtro la métrica
         * mediría sobre todo su actividad en vez del interés real.
         */
        if ($component->isPublished() && ! $component->isOwnedBy($request->user())) {
            $component->recordView();
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
                'status' => ['string', Rule::enum(ComponentStatus::class)],
            ]);
            $query->where('status', $request->input('status'));
        }

        $perPage = min((int) $request->integer('per_page', 15), 50);

        return ComponentResource::collection($query->paginate($perPage));
    }

    // --- Helpers ----------------------------------------------------------

    /**
     * Listado público sin ordenar: publicados + filtros.
     *
     * `files` se carga para poder resolver la portada (preview_url) de cada
     * tarjeta sin una query por componente.
     */
    private function baseQuery(Request $request): Builder
    {
        $query = Component::query()
            ->published()
            ->with(['author', 'category', 'tags', 'files']);

        $this->applyFilters($query, $request);

        return $query;
    }

    /**
     * Listado con búsqueda de texto aplicada.
     *
     * El orden en que se encadenan las dos ordenaciones decide cuál manda, y
     * eso es lo único delicado de este método:
     *
     *  - Si quien busca ha elegido un orden (`sort=price_asc`), ese orden manda
     *    y la relevancia solo desempata. Pedir "de más barato a más caro" y
     *    recibir otra cosa sería ignorar una petición explícita.
     *  - Si no ha elegido nada, manda la relevancia, y la fecha desempata. Sin
     *    esto el buscador devolvería lo más reciente en vez de lo que mejor
     *    encaja, que es el resultado que espera cualquiera al escribir algo.
     */
    private function searchQuery(Request $request, string $term, bool $fuzzy): Builder
    {
        $query = $this->baseQuery($request);

        $applySearch = fn (Builder $q): Builder => $fuzzy
            ? $q->resembling($term)
            : $q->matching($term);

        if ($request->filled('sort')) {
            $this->applySorting($query, $request);
            $applySearch($query);
        } else {
            $applySearch($query);
            $this->applySorting($query, $request);
        }

        return $query;
    }

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

        // La búsqueda de texto (`q`) NO se aplica aquí: necesita ordenar por
        // relevancia y tiene un plan B por similitud, así que vive en
        // searchQuery() y en los scopes `matching`/`resembling` del modelo.
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

        // Los ids ANTERIORES hacen falta para recalcular también las etiquetas
        // que el componente deja de usar: se quedan con un componente menos.
        $previous = $component->tags()->pluck('tags.id')->all();

        $component->tags()->sync($ids);

        // `sync()` toca la tabla pivote directamente y no dispara eventos del
        // modelo, así que el observer no se entera: hay que recalcular aquí.
        Tag::recount([...$previous, ...$ids->all()]);
    }
}
