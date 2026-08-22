<?php

use App\Http\Middleware\AuthenticateOptional;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Alias de middleware usados en routes/api.php.
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'active' => EnsureAccountIsActive::class,
            'auth.optional' => AuthenticateOptional::class,
        ]);

        // Nunca redirigir a una pantalla de login: aquí no hay ninguna.
        //
        // Laravel registra por su cuenta `redirectGuestsTo(fn () => route('login'))`
        // (ApplicationBuilder::withMiddleware), y esa llamada se evalúa DENTRO del
        // middleware de autenticación, antes de que el manejador de excepciones
        // pueda opinar. En una API desacoplada la ruta `login` no existe, así que
        // una petición sin sesión moría con un 500 «Route [login] not defined»
        // —traza incluida— en lugar de un 401.
        //
        // Devolviendo null no hay redirect, y la excepción sigue su curso normal
        // hasta el 401 en JSON de withExceptions.
        $middleware->redirectGuestsTo(fn (Request $request) => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Petición sin autenticar a la API: 401 en JSON.
        //
        // Hace falta a pesar del `shouldRenderJsonWhen` de arriba, porque el
        // orden de Laravel es otro: ante una AuthenticationException mira
        // PRIMERO si hay que redirigir y solo después si la respuesta debe ser
        // JSON. Y el redirect por defecto apunta a la ruta `login`, que en una
        // API desacoplada no existe — así que en vez de un 401 salía un 500
        // «Route [login] not defined», con su traza dentro.
        //
        // Solo se notaba sin cabecera `Accept: application/json`, que es como
        // llega un enlace de descarga abierto directamente en el navegador: el
        // SPA sí la manda siempre. De ahí que no lo cazara ningún test.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => $e->getMessage()], 401);
            }

            return null;
        });
    })->create();
