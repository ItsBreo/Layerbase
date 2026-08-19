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

        // Sin cuenta vinculable: el correo ya pertenece a otra cuenta y esta
        // identidad social no está enganchada a ella. Vincular por email sería
        // regalar la identidad a quien registrara ese correo primero. Ver
        // `upsertUser()`.
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
     * **NUNCA se vincula por email.** Solo por identificador de proveedor: o
     * esta identidad de Google/GitHub ya estaba enganchada a una cuenta, o se
     * crea una nueva. Si el correo ya lo tiene otra cuenta, se rechaza.
     *
     * Esa regla es lo que sostiene que el email se dé por verificado solo con
     * entrar. Antes el enlace por email sí existía y estaba condicionado a que
     * la cuenta local estuviera verificada, porque si no había una apropiación
     * de cuenta: registrarse con el correo de otra persona y esperar a que esa
     * persona entrara con Google, momento en el que su identidad social
     * quedaba enganchada a la cuenta del atacante.
     *
     * Con la verificación automática, "estar verificado" ya no demuestra que
     * el correo sea tuyo, así que esa condición dejaría de proteger nada. La
     * única defensa que sigue en pie es no vincular por email en absoluto: el
     * identificador de proveedor sí lo emite Google/GitHub y no se puede
     * inventar.
     *
     * El coste, asumido: quien se registró con contraseña no puede entrar
     * después con Google usando ese mismo correo. Hará falta vincular cuentas
     * desde el perfil, que hoy no existe.
     *
     * `users.email` es UNIQUE, así que "crear otra cuenta con el mismo correo"
     * tampoco es una salida: si el email está cogido, lo único posible es no
     * vincular y devolver null.
     */
    private function upsertUser(string $provider, SocialiteUser $socialUser): ?User
    {
        $oauthColumn = "{$provider}_oauth_id";
        $providerId = (string) $socialUser->getId();
        $email = mb_strtolower((string) $socialUser->getEmail());

        $user = User::where($oauthColumn, $providerId)->first();

        // El correo ya es de otra cuenta y esta identidad social no está
        // enganchada a ella: no se vincula, se rechaza.
        if ($user === null && $email !== '' && User::where('email', $email)->exists()) {
            return null;
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
