<?php

namespace App\Http\Controllers\Api\Component;

use App\Http\Controllers\Controller;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Catálogo público de tags para autocompletado. Devuelve los más usados o los
 * que coinciden con `q`.
 */
class TagController extends Controller
{
    /** GET /tags — busca tags por nombre (`q`), ordenados por popularidad. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Tag::query()->orderByDesc('components_count');

        if ($request->filled('q')) {
            $term = str_replace(['%', '_'], ['\%', '\_'], (string) $request->input('q'));
            $query->where('name', 'like', $term.'%');
        }

        return TagResource::collection($query->limit(20)->get());
    }
}
