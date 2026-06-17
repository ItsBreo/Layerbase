<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configurePasswords();
        $this->configurePasswordResetUrl();

        // El SPA consume JSON plano sin el envoltorio "data"; mantiene el
        // contrato de la API simple y consistente en todos los endpoints.
        JsonResource::withoutWrapping();
    }

    /**
     * Limitadores de tasa nombrados.
     *
     * - `api`: límite general por usuario/IP.
     * - `auth`: límite estricto para login/registro/reset, por email + IP,
     *   que mitiga fuerza bruta y enumeración sin penalizar a otros usuarios.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            $email = (string) $request->input('email');
            $key = Str::lower($email).'|'.$request->ip();

            return Limit::perMinute(6)->by($key);
        });
    }

    /**
     * Política de contraseñas centralizada. Más estricta fuera de local:
     * exige longitud, mayúsculas/minúsculas, números y comprobación contra
     * filtraciones conocidas (HaveIBeenPwned).
     */
    private function configurePasswords(): void
    {
        Password::defaults(function () {
            $rule = Password::min(8);

            return $this->app->isProduction()
                ? $rule->mixedCase()->numbers()->uncompromised()
                : $rule;
        });
    }

    /**
     * El enlace del email de reseteo apunta al SPA, no a una vista de Laravel.
     */
    private function configurePasswordResetUrl(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $frontend = rtrim((string) config('app.frontend_url'), '/');
            $query = http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            return "{$frontend}/reset-password?{$query}";
        });
    }
}
