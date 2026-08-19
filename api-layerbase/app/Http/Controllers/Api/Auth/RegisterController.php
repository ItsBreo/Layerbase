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

        /*
         * Verificar ANTES de disparar el evento, y ese orden es lo único
         * delicado de aquí: el listener de Laravel que manda el correo de
         * verificación comprueba `! hasVerifiedEmail()`, así que con la cuenta
         * ya verificada no envía nada. Registrarse deja la cuenta lista sin
         * pasar por el buzón.
         *
         * El evento se mantiene: si algún día se reactiva la verificación de
         * verdad, basta con quitar la línea de arriba y el correo vuelve a
         * salir solo. Ver User::markEmailAsVerifiedOnSignIn().
         */
        $user->markEmailAsVerifiedOnSignIn();

        event(new Registered($user));

        $token = $user->createToken($this->deviceName($request->input('device_name')))->plainTextToken;

        return response()->json([
            'token' => $token,
            // forSelf: la petición aún no está autenticada (el token se acaba
            // de emitir), así que sin esto la respuesta saldría sin email.
            'user' => UserResource::forSelf($user),
        ], 201);
    }

    private function deviceName(?string $name): string
    {
        return $name !== null && $name !== '' ? $name : 'spa';
    }
}
