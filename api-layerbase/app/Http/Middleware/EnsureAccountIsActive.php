<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea a usuarios baneados aunque tengan un token válido.
 *
 * Se aplica al grupo autenticado para que un baneo tenga efecto inmediato en
 * peticiones posteriores sin esperar a que expire el token.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->banned) {
            // Revoca el token actual (si es persistente) para cortar el acceso.
            $token = $request->user()->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            abort(Response::HTTP_FORBIDDEN, 'Tu cuenta está suspendida.');
        }

        return $next($request);
    }
}
