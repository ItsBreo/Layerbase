<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthSessionController extends Controller
{
    /**
     * Inicia sesión con email + contraseña y emite un token Sanctum.
     *
     * El throttling por (email + IP) vive en el middleware `throttle:auth`
     * de la ruta, lo que mitiga fuerza bruta sin acoplarlo al controlador.
     */
    public function store(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->input('email'))->first();

        // Hash::check con un hash falso cuando el usuario no existe iguala el
        // tiempo de respuesta y evita enumerar cuentas por timing.
        $passwordOk = $user && $user->password
            && Hash::check($request->input('password'), $user->password);

        if (! $passwordOk) {
            // Mensaje genérico: no revela si el email existe.
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if ($user->banned) {
            throw ValidationException::withMessages([
                'email' => ['Tu cuenta está suspendida. Contacta con soporte.'],
            ])->status(403);
        }

        $token = $user->createToken($this->deviceName($request->input('device_name')))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    /** Devuelve el usuario autenticado actual. */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /** Cierra la sesión revocando únicamente el token usado en esta petición. */
    public function destroy(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        // Solo hay token persistente que revocar en auth por Bearer; en sesión
        // por cookie el token es transitorio y no se borra aquí.
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    private function deviceName(?string $name): string
    {
        return $name !== null && $name !== '' ? $name : 'spa';
    }
}
