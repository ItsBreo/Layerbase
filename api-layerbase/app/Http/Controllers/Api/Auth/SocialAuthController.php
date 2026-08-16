<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

class SocialAuthController extends Controller
{
    /** Proveedores OAuth soportados (coincide con las columnas *_oauth_id). */
    private const PROVIDERS = ['github', 'google'];

    /** Minutos que vive un `state` antes de caducar. */
    private const STATE_TTL_MINUTES = 10;

    /**
     * Redirige al proveedor OAuth con un `state` propio.
     *
     * Socialite va en modo `stateless()` porque la API no mantiene sesión y su
     * `state` se apoya justamente en la sesión. Pero `state` NO es opcional: es
     * la protección CSRF del flujo OAuth, y el proveedor solo lo devuelve tal
     * cual — no lo valida por ti. Sin él, un atacante puede hacer que la víctima
     * complete el flujo con el código de autorización del atacante y acabe con
     * sesión iniciada en la cuenta de este.
     *
     * Como no hay sesión donde guardarlo, se guarda en cache con TTL corto.
     */
    public function redirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);

        $state = Str::random(40);
        Cache::put($this->stateKey($state), $provider, now()->addMinutes(self::STATE_TTL_MINUTES));

        return Socialite::driver($provider)
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    /**
     * Callback del proveedor: crea/actualiza el usuario local, emite un token
     * y redirige al frontend con el token en el fragmento de la URL (#),
     * que no viaja al servidor ni queda en logs de acceso.
     */
    public function callback(Request $request, string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);

        // El `state` se consume: un mismo valor no sirve dos veces, así que un
        // callback capturado no se puede reproducir.
        if (! $this->consumeState($request->query('state'), $provider)) {
            Log::warning('OAuth callback con state inválido', ['provider' => $provider]);

            return redirect()->away($this->frontendUrl('/login?error=oauth_state'));
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            // No filtramos el detalle al cliente; lo registramos para depurar.
            Log::warning('OAuth callback falló', ['provider' => $provider, 'error' => $e->getMessage()]);

            return redirect()->away($this->frontendUrl('/login?error=oauth'));
        }

        $user = $this->upsertUser($provider, $socialUser);

        // Sin cuenta vinculable: el email ya pertenece a una cuenta local que
        // nadie ha verificado, así que enlazar sería regalarle esa identidad a
        // quien la registró. Ver `upsertUser()`.
        if ($user === null) {
            return redirect()->away($this->frontendUrl('/login?error=oauth_email_taken'));
        }

        if ($user->banned) {
            return redirect()->away($this->frontendUrl('/login?error=banned'));
        }

        $token = $user->createToken("oauth-{$provider}")->plainTextToken;

        return redirect()->away($this->frontendUrl('/auth/callback#token='.$token));
    }

    /**
     * Vincula la identidad social a una cuenta local.
     *
     * Orden: primero por oauth id (vínculo ya establecido, siempre seguro),
     * después por email y, si no hay nada, se crea una cuenta.
     *
     * EL ENLACE POR EMAIL SOLO VALE SI LA CUENTA LOCAL ESTÁ VERIFICADA. Antes
     * no se comprobaba, y eso abría una apropiación de cuenta: como el registro
     * no verificaba nada, bastaba con registrarse usando el correo de otra
     * persona y esperar. Cuando esa persona entraba con Google, la búsqueda por
     * email encontraba la cuenta del atacante y le enganchaba su identidad
     * social; a partir de ahí la víctima trabajaba sobre una cuenta cuya
     * contraseña conocía el atacante.
     *
     * `users.email` es UNIQUE, así que "crear otra cuenta con el mismo correo"
     * no es una salida posible: si el email está cogido por una cuenta sin
     * verificar, lo único seguro es no vincular y devolver null.
     */
    private function upsertUser(string $provider, SocialiteUser $socialUser): ?User
    {
        $oauthColumn = "{$provider}_oauth_id";
        $providerId = (string) $socialUser->getId();
        $email = mb_strtolower((string) $socialUser->getEmail());

        $user = User::where($oauthColumn, $providerId)->first();

        if ($user === null && $email !== '') {
            $byEmail = User::where('email', $email)->first();

            if ($byEmail !== null && ! $byEmail->hasVerifiedEmail()) {
                return null;
            }

            $user = $byEmail;
        }

        if ($user === null) {
            $user = new User;
            $user->email = $email;
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

    /** Clave de cache de un `state`. */
    private function stateKey(string $state): string
    {
        return "oauth_state:{$state}";
    }

    /**
     * Valida y consume el `state` del callback. Devuelve false si no llega, si
     * no existe (caducado o inventado), si ya se usó, o si se emitió para otro
     * proveedor — cruzar proveedores permitiría reutilizar un state legítimo.
     */
    private function consumeState(?string $state, string $provider): bool
    {
        if ($state === null || $state === '') {
            return false;
        }

        $key = $this->stateKey($state);

        if (Cache::pull($key) !== $provider) {
            return false;
        }

        return true;
    }

    /** Construye una URL absoluta del frontend a partir de config (sin hardcodear). */
    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/'.ltrim($path, '/');
    }
}
