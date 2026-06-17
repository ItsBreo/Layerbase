<?php

use App\Http\Controllers\Api\Auth\AuthSessionController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API de Layerbase
|--------------------------------------------------------------------------
| Todas las rutas cuelgan del prefijo `/api` (definido en bootstrap/app.php).
| Convención REST: sustantivos en plural, verbos HTTP semánticos y throttling
| estricto en los endpoints sensibles de autenticación.
*/

Route::prefix('auth')->group(function () {
    // --- Públicas (con límite anti fuerza bruta por email+IP) ---
    Route::middleware('throttle:auth')->group(function () {
        Route::post('register', RegisterController::class)->name('auth.register');
        Route::post('login', [AuthSessionController::class, 'store'])->name('auth.login');
        Route::post('forgot-password', [PasswordResetController::class, 'sendResetLink'])->name('auth.forgot-password');
        Route::post('reset-password', [PasswordResetController::class, 'reset'])->name('auth.reset-password');
    });

    // --- OAuth (GitHub / Google) ---
    Route::middleware('throttle:auth')->group(function () {
        Route::get('{provider}/redirect', [SocialAuthController::class, 'redirect'])
            ->whereIn('provider', ['github', 'google'])
            ->name('auth.oauth.redirect');
        Route::get('{provider}/callback', [SocialAuthController::class, 'callback'])
            ->whereIn('provider', ['github', 'google'])
            ->name('auth.oauth.callback');
    });

    // --- Protegidas (token Sanctum + cuenta activa) ---
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('me', [AuthSessionController::class, 'me'])->name('auth.me');
        Route::post('logout', [AuthSessionController::class, 'destroy'])->name('auth.logout');
    });
});

/*
|--------------------------------------------------------------------------
| Rutas protegidas de ejemplo por rol
|--------------------------------------------------------------------------
| Plantilla para el panel de admin y de autor. La lógica de negocio se irá
| añadiendo en las siguientes semanas del roadmap (S2–S4).
*/
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('ping', fn () => response()->json(['message' => 'admin ok']))->name('admin.ping');
    });

    Route::middleware('role:author')->prefix('author')->group(function () {
        Route::get('ping', fn () => response()->json(['message' => 'author ok']))->name('author.ping');
    });
});
