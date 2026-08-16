<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Verificación de la dirección de email.
 *
 * No es una comodidad: es la mitad del arreglo de una vía de apropiación de
 * cuenta. Mientras cualquiera pudiera registrarse con el correo de otro, bastaba
 * con hacerlo y esperar a que la víctima entrase con Google para que su
 * identidad social quedara enganchada a la cuenta del atacante. Ver
 * `SocialAuthController::upsertUser()`, que ahora solo vincula por email si la
 * cuenta local está verificada.
 */
class EmailVerificationController extends Controller
{
    /**
     * GET /auth/email/verify/{id}/{hash} — destino del enlace del correo.
     *
     * La ruta NO exige sesión: el enlace se abre desde el cliente de correo,
     * donde normalmente no hay token. Lo que la protege es la firma de la URL
     * (middleware `signed`) más el hash del email, que no se pueden falsificar.
     *
     * Redirige al SPA con el resultado, igual que hace el callback de OAuth: es
     * un enlace que se abre en el navegador, no una llamada de la API.
     */
    public function verify(string $id, string $hash): RedirectResponse
    {
        $user = User::find($id);

        // hash_equals: comparación en tiempo constante, como hace el propio
        // Laravel en su EnsureEmailIsVerified.
        if ($user === null || ! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return redirect()->away($this->frontendUrl('/verify-email?status=invalid'));
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->away($this->frontendUrl('/verify-email?status=already'));
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return redirect()->away($this->frontendUrl('/verify-email?status=success'));
    }

    /**
     * POST /auth/email/verification-notification — reenvía el correo.
     *
     * Responde igual esté o no verificada la cuenta, para no convertir el
     * endpoint en una forma de averiguar el estado de cuentas ajenas.
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json([
            'message' => 'Si tu cuenta no estaba verificada, te hemos enviado un correo.',
        ]);
    }

    /** URL absoluta del frontend a partir de config (sin hardcodear). */
    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/'.ltrim($path, '/');
    }
}
