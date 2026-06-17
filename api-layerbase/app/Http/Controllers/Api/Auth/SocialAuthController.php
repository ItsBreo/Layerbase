<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

class SocialAuthController extends Controller
{
    /** Proveedores OAuth soportados (coincide con las columnas *_oauth_id). */
    private const PROVIDERS = ['github', 'google'];

    /**
     * Redirige al proveedor OAuth.
     *
     * Stateless: la API no mantiene sesión, así que no usamos el state de
     * sesión de Socialite (lo valida el propio proveedor vía el flujo OAuth).
     */
    public function redirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);

        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Callback del proveedor: crea/actualiza el usuario local, emite un token
     * y redirige al frontend con el token en el fragmento de la URL (#),
     * que no viaja al servidor ni queda en logs de acceso.
     */
    public function callback(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            // No filtramos el detalle al cliente; lo registramos para depurar.
            Log::warning('OAuth callback falló', ['provider' => $provider, 'error' => $e->getMessage()]);

            return redirect()->away($this->frontendUrl('/login?error=oauth'));
        }

        $user = $this->upsertUser($provider, $socialUser);

        if ($user->banned) {
            return redirect()->away($this->frontendUrl('/login?error=banned'));
        }

        $token = $user->createToken("oauth-{$provider}")->plainTextToken;

        return redirect()->away($this->frontendUrl('/auth/callback#token='.$token));
    }

    /**
     * Vincula la identidad social a una cuenta local: primero por oauth id,
     * luego por email (vincula cuentas existentes), y si no, crea una nueva.
     */
    private function upsertUser(string $provider, SocialiteUser $socialUser): User
    {
        $oauthColumn = "{$provider}_oauth_id";
        $providerId = (string) $socialUser->getId();

        $user = User::where($oauthColumn, $providerId)->first()
            ?? User::where('email', mb_strtolower((string) $socialUser->getEmail()))->first();

        if ($user === null) {
            $user = new User;
            $user->email = mb_strtolower((string) $socialUser->getEmail());
            $user->name = $socialUser->getName() ?: $socialUser->getNickname() ?: 'Usuario';
            // Cuenta OAuth: sin contraseña local; email considerado verificado.
            $user->password = null;
            $user->email_verified_at = now();
        }

        $user->{$oauthColumn} = $providerId;
        $user->avatar_url ??= $socialUser->getAvatar();

        if ($provider === 'github' && $nickname = $socialUser->getNickname()) {
            $user->github_username ??= $nickname;
        }

        $user->save();

        return $user;
    }

    /** Construye una URL absoluta del frontend a partir de config (sin hardcodear). */
    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/'.ltrim($path, '/');
    }
}
