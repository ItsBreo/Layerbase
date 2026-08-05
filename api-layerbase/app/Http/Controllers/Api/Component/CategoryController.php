<?php

namespace App\Http\Controllers\Api\Component;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Catálogo público de categorías (para filtros del listado y el formulario de
 * creación). Solo lectura; la gestión (crear/editar) es de admin, en otro
 * módulo.
 */
class CategoryController extends Controller
{
    /** GET /categories — todas las categorías, opcionalmente filtradas por stack. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::query()->orderBy('name');

        if ($request->filled('stack')) {
            // Incluye las transversales ('all') junto a las del stack pedido.
            $query->whereIn('stack', [$request->input('stack'), 'all']);
        }

        return CategoryResource::collection($query->get());
    }
}
