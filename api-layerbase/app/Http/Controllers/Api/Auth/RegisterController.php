<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    /**
     * Registra una cuenta nueva (rol `user` por defecto vía la columna) y
     * devuelve un token de acceso para iniciar sesión inmediatamente.
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        // Solo se asignan los campos validados; `role` queda en su default
        // seguro ('user') y no es mass-assignable.
        $user = User::create($request->safe()->only(['name', 'email', 'password']));

        // Permite enganchar verificación de email más adelante sin bloquear el MVP.
        event(new Registered($user));

        $token = $user->createToken($this->deviceName($request->input('device_name')))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ], 201);
    }

    private function deviceName(?string $name): string
    {
        return $name !== null && $name !== '' ? $name : 'spa';
    }
}
