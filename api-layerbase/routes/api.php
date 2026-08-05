<?php

use App\Http\Controllers\Api\Auth\AuthSessionController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\Component\CategoryController;
use App\Http\Controllers\Api\Component\ComponentController;
use App\Http\Controllers\Api\Component\ComponentFileController;
use App\Http\Controllers\Api\Component\ComponentStateController;
use App\Http\Controllers\Api\Component\TagController;
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

/*
|--------------------------------------------------------------------------
| Módulo 3 — Componentes (CRUD, moderación y archivos)
|--------------------------------------------------------------------------
| Listado y detalle son públicos (solo publicados). Creación/edición/borrado,
| máquina de estados y archivos exigen sesión (Sanctum + cuenta activa) y
| pasan por ComponentPolicy.
*/

// Catálogos de apoyo (públicos, solo lectura).
Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
Route::get('tags', [TagController::class, 'index'])->name('tags.index');

Route::prefix('components')->group(function () {
    // --- Público ---
    Route::get('/', [ComponentController::class, 'index'])->name('components.index');

    // --- Autor autenticado ---
    // Nota: `my` y las rutas fijas se declaran ANTES del comodín {component}
    // para que no las capture como slug.
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('my', [ComponentController::class, 'my'])->name('components.my');
        Route::post('/', [ComponentController::class, 'store'])->name('components.store');
        Route::patch('{component}', [ComponentController::class, 'update'])->name('components.update');
        Route::delete('{component}', [ComponentController::class, 'destroy'])->name('components.destroy');

        // Máquina de estados de moderación.
        Route::post('{component}/submit', [ComponentStateController::class, 'submit'])->name('components.submit');
        Route::post('{component}/unpublish', [ComponentStateController::class, 'unpublish'])->name('components.unpublish');

        // Archivos: subida y descarga protegida del código fuente.
        Route::post('{component}/files', [ComponentFileController::class, 'store'])->name('components.files.store');
        Route::get('{component}/download', [ComponentFileController::class, 'download'])->name('components.download');
    });

    // --- Público (al final: no debe capturar rutas fijas como `my`) ---
    Route::get('{component}', [ComponentController::class, 'show'])->name('components.show');
});
