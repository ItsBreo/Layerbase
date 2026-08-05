<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autenticación OPCIONAL para rutas públicas que se comportan distinto si hay
 * sesión (p. ej. el detalle de un componente: un invitado solo ve publicados,
 * pero el autor puede ver su propio borrador).
 *
 * Si llega un Bearer token válido, resuelve el usuario vía el guard de Sanctum
 * y lo fija como usuario autenticado de la petición, de modo que
 * `$request->user()` y las policies funcionan igual que en una ruta protegida.
 * Si no hay token o es inválido, NO rechaza: la petición sigue como invitado.
 */
class AuthenticateOptional
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken()) {
            $user = $request->user('sanctum');
            if ($user !== null) {
                // Fija el usuario en el guard por defecto para que
                // $request->user() y Gate lo vean en toda la petición.
                Auth::setUser($user);
            }
        }

        return $next($request);
    }
}
