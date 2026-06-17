<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autoriza solo a usuarios con alguno de los roles indicados.
 *
 * Uso en rutas: `->middleware('role:admin')` o `->middleware('role:author,admin')`.
 * Se apoya en la columna `users.role`; los admin pasan cualquier comprobación.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Sin autenticar: 401 (no 403) para que el cliente sepa que debe loguearse.
        abort_if($user === null, Response::HTTP_UNAUTHORIZED);

        $allowed = $user->isAdmin() || in_array($user->role->value, $roles, true);

        abort_unless($allowed, Response::HTTP_FORBIDDEN, 'No tienes permisos para esta acción.');

        return $next($request);
    }
}
