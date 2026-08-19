<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\TagResource;
use App\Models\Category;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

/**
 * Gestión del catálogo: categorías y etiquetas.
 *
 * Hasta ahora las categorías solo se podían tocar por seeder y las etiquetas
 * las creaban los autores sin ningún control, así que el catálogo crecía sin
 * que nadie pudiera podarlo. `CategoryController` ya documentaba que su gestión
 * "es de admin, en otro módulo": este es ese módulo.
 *
 * Diferencia importante entre ambos: una categoría la crea un admin y es
 * estructura; una etiqueta la crea cualquier autor al escribirla, así que aquí
 * no se pueden crear — solo revisar y limpiar las que se quedaron sin uso.
 */
class CatalogController extends Controller
{
    // --- Categorías -------------------------------------------------------

    /** GET /admin/catalog/categories */
    public function categories(): AnonymousResourceCollection
    {
        /*
         * Dos números distintos y los dos hacen falta:
         *  - `components_count` (columna) son los PUBLICADOS, lo que se enseña
         *    en el catálogo público.
         *  - `total_components` cuenta todos los estados, y es lo que decide si
         *    la categoría se puede borrar (la FK es restrictiva).
         *
         * El alias es obligatorio: `withCount('components')` se llamaría igual
         * que la columna y la machacaría en memoria.
         */
        return CategoryResource::collection(
            Category::query()->withCount('components as total_components')->orderBy('name')->get()
        );
    }

    /** POST /admin/catalog/categories */
    public function storeCategory(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return response()->json([
            'message' => 'Categoría creada.',
            'data' => new CategoryResource($category->loadCount('components as total_components')),
        ], 201);
    }

    /** PATCH /admin/catalog/categories/{category} */
    public function updateCategory(StoreCategoryRequest $request, Category $category): JsonResponse
    {
        /*
         * El slug NO se regenera al renombrar, igual que en los componentes: ya
         * hay enlaces y filtros del marketplace apuntando a él, y cambiarlo los
         * rompería en silencio.
         */
        $category->fill($request->validated());
        $category->save();

        return response()->json([
            'message' => 'Categoría actualizada.',
            'data' => new CategoryResource($category->loadCount('components as total_components')),
        ]);
    }

    /** DELETE /admin/catalog/categories/{category} */
    public function destroyCategory(Category $category): JsonResponse
    {
        /*
         * La FK de components.category_id es restrictOnDelete, así que la base
         * de datos ya lo impediría — pero con un error 500 ilegible. Se
         * comprueba antes para poder decir POR QUÉ no se puede, y cuántos
         * componentes habría que mover primero.
         */
        $count = $category->components()->count();

        if ($count > 0) {
            throw ValidationException::withMessages([
                'category' => ["No se puede borrar: {$count} componente(s) siguen en esta categoría."],
            ]);
        }

        $category->delete();

        return response()->json(null, 204);
    }

    // --- Etiquetas --------------------------------------------------------

    /**
     * GET /admin/catalog/tags — etiquetas con su uso real.
     *
     * `?orphan=1` deja solo las que no las usa ningún componente, que son las
     * candidatas a limpiar.
     */
    public function tags(Request $request): AnonymousResourceCollection
    {
        $query = Tag::query()
            ->withCount('components as total_components')
            ->orderByDesc('components_count')
            ->orderBy('name');

        if ($request->boolean('orphan')) {
            $query->orphan();
        }

        if ($request->filled('q')) {
            $term = str_replace(['%', '_'], ['\%', '\_'], (string) $request->input('q'));
            $query->where('name', 'like', $term.'%');
        }

        return TagResource::collection($query->limit(200)->get());
    }

    /** DELETE /admin/catalog/tags/{tag} — solo si no la usa nadie. */
    public function destroyTag(Tag $tag): JsonResponse
    {
        $count = $tag->components()->count();

        if ($count > 0) {
            throw ValidationException::withMessages([
                'tag' => ["No se puede borrar: {$count} componente(s) usan esta etiqueta."],
            ]);
        }

        $tag->delete();

        return response()->json(null, 204);
    }

    /**
     * DELETE /admin/catalog/tags — borra de golpe TODAS las huérfanas.
     *
     * Las etiquetas se quedan sin uso solas: basta con que un autor cambie las
     * suyas o borre un componente. Ir una a una no escala, y son borrados sin
     * consecuencias — una etiqueta que no usa nadie no la echa nadie de menos.
     */
    public function purgeOrphanTags(): JsonResponse
    {
        $deleted = Tag::query()->orphan()->delete();

        return response()->json([
            'message' => "Se han eliminado {$deleted} etiqueta(s) sin uso.",
            'deleted' => $deleted,
        ]);
    }
}
