<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BanUserRequest;
use App\Http\Requests\Admin\UpdateUserRoleRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Gestión de usuarios del panel de admin: roles y suspensiones.
 *
 * La columna `banned` y el middleware `EnsureAccountIsActive` ya existían, pero
 * nada podía escribirlas: hasta ahora suspender una cuenta solo era posible por
 * SQL. Este controlador es la vía normal.
 *
 * INVARIANTE que sostiene todo lo demás: **un admin no puede actuar sobre sí
 * mismo** (ni cambiarse el rol ni suspenderse). Eso garantiza que siempre queda
 * al menos un admin activo, sin necesidad de contar admins en cada operación:
 * quien ejecuta la acción nunca puede ser su víctima.
 */
class UserController extends Controller
{
    /**
     * GET /admin/users — listado con búsqueda y filtros.
     *
     * Ordena por alta descendente: al entrar interesa ver quién acaba de
     * registrarse. `withCount('components')` evita un N+1 al pintar cuántos
     * componentes tiene cada fila.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'role' => ['sometimes', 'string', Rule::enum(UserRole::class)],
            'banned' => ['sometimes', 'boolean'],
        ]);

        $query = User::query()->withCount('components')->latest();

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        // `filled` descartaría `banned=0`, que es un filtro legítimo.
        if ($request->has('banned')) {
            $query->where('banned', $request->boolean('banned'));
        }

        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\%', '\_'], (string) $request->input('q')).'%';
            $query->where(function (Builder $q) use ($term): void {
                // `ilike` y no `like`: en PostgreSQL `LIKE` distingue
                // mayúsculas, así que buscar "Jos" no encontraba a "josue".
                $q->where('name', 'ilike', $term)->orWhere('email', 'ilike', $term);
            });
        }

        $perPage = min((int) $request->integer('per_page', 20), 50);

        return UserResource::collection($query->paginate($perPage));
    }

    /**
     * GET /admin/users/counts — total, suspendidos y desglose por rol.
     * Dos queries agregadas en vez de una petición por pestaña.
     */
    public function counts(): JsonResponse
    {
        $byRole = User::query()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $roles = collect(UserRole::values())
            ->mapWithKeys(fn (string $role) => [$role => (int) ($byRole[$role] ?? 0)]);

        return response()->json([
            'data' => [
                'total' => (int) $byRole->sum(),
                'banned' => User::query()->where('banned', true)->count(),
                'roles' => $roles,
            ],
        ]);
    }

    /**
     * PATCH /admin/users/{user}/role — cambia el rol global.
     *
     * Un admin no puede cambiarse el suyo: es lo que impide que el último
     * administrador se degrade y deje la plataforma sin nadie que la gestione.
     */
    public function updateRole(UpdateUserRoleRequest $request, User $user): JsonResponse
    {
        $this->assertNotSelf($request, $user, 'No puedes cambiar tu propio rol.');

        $user->changeRole(UserRole::from($request->validated('role')));

        return $this->respond($request, $user, 'Rol actualizado.');
    }

    /**
     * POST /admin/users/{user}/ban — suspende la cuenta (motivo obligatorio).
     * Revoca sus tokens, así que el corte es inmediato.
     */
    public function ban(BanUserRequest $request, User $user): JsonResponse
    {
        $this->assertNotSelf($request, $user, 'No puedes suspender tu propia cuenta.');

        $user->ban($request->validated('reason'));

        return $this->respond($request, $user, 'Cuenta suspendida.');
    }

    /** POST /admin/users/{user}/unban — reactiva la cuenta. */
    public function unban(Request $request, User $user): JsonResponse
    {
        $user->unban();

        return $this->respond($request, $user, 'Cuenta reactivada.');
    }

    // --- Helpers ----------------------------------------------------------

    /**
     * Corta si el admin se está apuntando a sí mismo. 422 y no 403: la acción
     * es legítima, lo que no vale es el objetivo.
     */
    private function assertNotSelf(Request $request, User $user, string $message): void
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => [$message]]);
        }
    }

    private function respond(Request $request, User $user, string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => new UserResource($user->loadCount('components')),
        ]);
    }
}
