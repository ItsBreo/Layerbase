<?php

use App\Http\Controllers\Api\Admin\CatalogController;
use App\Http\Controllers\Api\Admin\MetricsController;
use App\Http\Controllers\Api\Admin\ModerationController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Auth\AuthSessionController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\Component\CategoryController;
use App\Http\Controllers\Api\Component\ComponentController;
use App\Http\Controllers\Api\Component\ComponentFileController;
use App\Http\Controllers\Api\Component\ComponentStateController;
use App\Http\Controllers\Api\Component\TagController;
use App\Http\Controllers\Api\Profile\ProfileController;
use App\Http\Controllers\Api\Review\ReviewController;
use App\Http\Controllers\Api\User\PublicProfileController;
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

    // --- Verificación de email ---
    // El enlace del correo se abre desde el cliente de correo, sin token: lo
    // protege la firma de la URL, no la sesión. Por eso va fuera del grupo
    // autenticado. El nombre `verification.verify` es el que Laravel usa para
    // construir la URL del email, así que no se puede cambiar.
    Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware('signed')
        ->name('verification.verify');

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

        // Reenvío del correo de verificación. Throttle `auth`: es un endpoint
        // que manda emails, así que no puede quedar abierto a repetición.
        Route::post('email/verification-notification', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:auth')
            ->name('verification.send');

        Route::post('logout', [AuthSessionController::class, 'destroy'])->name('auth.logout');

        // Perfil del propio usuario. Sin parámetro de usuario en la ruta: se
        // opera siempre sobre el autenticado.
        Route::patch('profile', [ProfileController::class, 'update'])->name('auth.profile.update');
        Route::post('avatar', [ProfileController::class, 'updateAvatar'])->name('auth.avatar.update');
        Route::put('password', [ProfileController::class, 'updatePassword'])
            ->middleware('throttle:auth')
            ->name('auth.password.update');
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

        // Resumen de la plataforma (solo lectura).
        Route::get('metrics', [MetricsController::class, 'index'])->name('admin.metrics');

        // --- Catálogo ---
        // Las categorías son estructura y las crea un admin; las etiquetas las
        // crean los autores al escribirlas, así que aquí solo se revisan y se
        // limpian las que se quedaron sin uso.
        Route::get('catalog/categories', [CatalogController::class, 'categories'])->name('admin.catalog.categories');
        Route::post('catalog/categories', [CatalogController::class, 'storeCategory'])->name('admin.catalog.categories.store');
        Route::patch('catalog/categories/{category}', [CatalogController::class, 'updateCategory'])->name('admin.catalog.categories.update');
        Route::delete('catalog/categories/{category}', [CatalogController::class, 'destroyCategory'])->name('admin.catalog.categories.destroy');

        // La purga masiva va ANTES del comodín para que no la capture como slug.
        Route::delete('catalog/tags', [CatalogController::class, 'purgeOrphanTags'])->name('admin.catalog.tags.purge');
        Route::get('catalog/tags', [CatalogController::class, 'tags'])->name('admin.catalog.tags');
        Route::delete('catalog/tags/{tag}', [CatalogController::class, 'destroyTag'])->name('admin.catalog.tags.destroy');

        // --- Moderación ---
        // Cola de revisión (lectura) + las dos transiciones que solo un admin
        // puede ejecutar. Van aquí, y no junto al resto de estados, para que la
        // frontera de autorización se vea en la URL: nada bajo /admin lo toca
        // un autor. La policy `moderate` lo vuelve a comprobar igualmente.
        Route::get('components', [ModerationController::class, 'index'])->name('admin.components.index');
        Route::get('components/counts', [ModerationController::class, 'counts'])->name('admin.components.counts');
        Route::post('components/{component}/approve', [ComponentStateController::class, 'approve'])
            ->name('admin.components.approve');
        Route::post('components/{component}/reject', [ComponentStateController::class, 'reject'])
            ->name('admin.components.reject');

        // --- Gestión de usuarios ---
        // Roles y suspensiones. `counts` va ANTES del comodín {user} para que
        // no lo capture como id.
        Route::get('users', [AdminUserController::class, 'index'])->name('admin.users.index');
        Route::get('users/counts', [AdminUserController::class, 'counts'])->name('admin.users.counts');
        Route::patch('users/{user}/role', [AdminUserController::class, 'updateRole'])->name('admin.users.role');
        Route::post('users/{user}/ban', [AdminUserController::class, 'ban'])->name('admin.users.ban');
        Route::post('users/{user}/unban', [AdminUserController::class, 'unban'])->name('admin.users.unban');
    });

    Route::middleware('role:author')->prefix('author')->group(function () {
        Route::get('ping', fn () => response()->json(['message' => 'author ok']))->name('author.ping');
    });
});

/*
|--------------------------------------------------------------------------
| Valoraciones
|--------------------------------------------------------------------------
| Operar sobre una valoración concreta no depende del componente, así que
| cuelgan de /reviews y no de /components/{c}/reviews/{r}.
*/
Route::middleware(['auth:sanctum', 'active'])->prefix('reviews')->group(function () {
    Route::patch('{review}', [ReviewController::class, 'update'])->name('reviews.update');
    Route::delete('{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
    Route::post('{review}/report', [ReviewController::class, 'report'])->name('reviews.report');
});

/*
|--------------------------------------------------------------------------
| Módulo 3 — Componentes (CRUD, moderación y archivos)
|--------------------------------------------------------------------------
| Listado y detalle son públicos (solo publicados). Creación/edición/borrado,
| máquina de estados y archivos exigen sesión (Sanctum + cuenta activa) y
| pasan por ComponentPolicy.
*/

/*
|--------------------------------------------------------------------------
| Perfil público de autor
|--------------------------------------------------------------------------
| Auth opcional: un invitado lo ve igual, pero con sesión el recurso puede
| enseñar más (el dueño y los admin ven siempre el resumen de autor, esté
| publicado o no).
*/
Route::middleware('auth.optional')->group(function () {
    Route::get('users/{user}', [PublicProfileController::class, 'show'])->name('users.show');
    Route::get('users/{user}/components', [PublicProfileController::class, 'components'])
        ->name('users.components');
});

// Catálogos de apoyo (públicos, solo lectura).
Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
Route::get('tags', [TagController::class, 'index'])->name('tags.index');

Route::prefix('components')->group(function () {
    // --- Público con auth OPCIONAL ---
    // Si viene token, se resuelve el usuario (el autor ve sus borradores y las
    // fichas reflejan al espectador); si no, siguen accesibles como invitado.
    Route::get('/', [ComponentController::class, 'index'])
        ->middleware('auth.optional')
        ->name('components.index');

    // Valoraciones: leer es público (auth opcional, para marcar cuál es la
    // tuya); escribir exige sesión y pasa por ReviewPolicy.
    Route::get('{component}/reviews', [ReviewController::class, 'index'])
        ->middleware('auth.optional')
        ->name('components.reviews.index');

    // Código para el render en sandbox de la ficha. Público con auth opcional:
    // la policy `previewSource` solo lo sirve si el componente es gratuito
    // (o propio/comprado). No cuenta como descarga.
    Route::get('{component}/preview-code', [ComponentFileController::class, 'previewCode'])
        ->middleware('auth.optional')
        ->name('components.preview-code');

    // --- Autor autenticado ---
    // Nota: `my` y las rutas fijas se declaran ANTES del comodín {component}
    // para que no las capture como slug.
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('my', [ComponentController::class, 'my'])->name('components.my');
        Route::post('/', [ComponentController::class, 'store'])->name('components.store');
        Route::patch('{component}', [ComponentController::class, 'update'])->name('components.update');
        Route::delete('{component}', [ComponentController::class, 'destroy'])->name('components.destroy');

        // Máquina de estados de moderación.
        Route::post('{component}/reviews', [ReviewController::class, 'store'])->name('components.reviews.store');

        Route::post('{component}/submit', [ComponentStateController::class, 'submit'])->name('components.submit');
        Route::post('{component}/unpublish', [ComponentStateController::class, 'unpublish'])->name('components.unpublish');
        // Vuelta a borrador tras un rechazo o una despublicación: sin esto un
        // componente rechazado no tendría manera de volver a revisión.
        Route::post('{component}/revert', [ComponentStateController::class, 'revert'])->name('components.revert');

        // Archivos: subida y descarga protegida del código fuente.
        Route::post('{component}/files', [ComponentFileController::class, 'store'])->name('components.files.store');
        Route::get('{component}/download', [ComponentFileController::class, 'download'])->name('components.download');
    });

    // --- Público con auth OPCIONAL (al final: no debe capturar `my`) ---
    Route::get('{component}', [ComponentController::class, 'show'])
        ->middleware('auth.optional')
        ->name('components.show');
});
