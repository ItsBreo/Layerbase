<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\ComponentResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

/**
 * Perfil público de un autor.
 *
 * Es la pieza que le faltaba a `users.stats_public`: existían la columna, el
 * conmutador del dashboard y la rama de `UserResource` que enseña el resumen a
 * terceros, pero no había ni endpoint ni página donde un tercero pudiera verlo.
 * El ajuste estaba ahí sin hacer nada.
 *
 * Auth OPCIONAL: un invitado ve el perfil igual, pero si viene sesión el
 * recurso puede enseñar más (el propio dueño y los admin ven siempre el
 * resumen, esté publicado o no).
 */
class PublicProfileController extends Controller
{
    /**
     * GET /users/{user} — ficha pública del autor.
     *
     * `withStats` fuerza el cálculo del resumen; que llegue o no al cliente lo
     * decide `UserResource` según `stats_public` y quién mire.
     */
    public function show(User $user): UserResource
    {
        $this->assertVisible($user);

        return UserResource::withStats($user);
    }

    /**
     * GET /users/{user}/components — sus componentes PUBLICADOS, paginados.
     *
     * Solo publicados, sin excepción para el dueño: esta es la vista pública, y
     * el autor ya tiene `/components/my` para ver sus borradores. Si aquí se
     * colaran, el autor vería una página distinta de la que ve todo el mundo.
     */
    public function components(Request $request, User $user): AnonymousResourceCollection
    {
        $this->assertVisible($user);

        $query = $user->components()
            ->published()
            ->with(['author', 'category', 'tags', 'files'])
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        $perPage = min((int) $request->integer('per_page', 12), 50);

        return ComponentResource::collection($query->paginate($perPage));
    }

    /**
     * Una cuenta suspendida no tiene perfil público.
     *
     * 404 y no 403: que exista o no la cuenta de alguien suspendido no es
     * información que se deba confirmar a un desconocido.
     */
    private function assertVisible(User $user): void
    {
        abort_if($user->banned, Response::HTTP_NOT_FOUND);
    }
}
