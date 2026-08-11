<?php

namespace App\Http\Controllers\Api\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Requests\Profile\UploadAvatarRequest;
use App\Http\Resources\UserResource;
use App\Services\AvatarService;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Perfil del usuario autenticado: datos públicos, avatar y contraseña.
 *
 * Todo opera SIEMPRE sobre `$request->user()`; no hay parámetro de usuario en
 * ninguna ruta, así que no existe la posibilidad de editar el perfil de otro.
 */
class ProfileController extends Controller
{
    public function __construct(private readonly AvatarService $avatars) {}

    /**
     * PATCH /auth/profile — actualiza el perfil público.
     */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $user->fill($request->validated());
        $user->save();

        return UserResource::withStats($user);
    }

    /**
     * PUT /auth/password — cambia la contraseña.
     *
     * Al cambiarla se revocan el resto de tokens del usuario (el actual se
     * conserva para no echar de la app a quien acaba de hacerlo): si alguien
     * había robado una sesión, aquí se le cierra.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->password = $request->validated()['password'];
        $user->save();

        // Solo un token real (PersonalAccessToken) tiene id que preservar; con
        // sesión/TransientToken no hay nada que salvar y se revoca todo.
        $current = $user->currentAccessToken();
        $user->tokens()
            ->when(
                $current instanceof PersonalAccessToken,
                fn ($query) => $query->whereKeyNot($current->getKey()),
            )
            ->delete();

        return response()->json(['message' => 'Contraseña actualizada.']);
    }

    /**
     * POST /auth/avatar — sube (o reemplaza) la foto de perfil.
     */
    public function updateAvatar(UploadAvatarRequest $request): UserResource
    {
        $user = $request->user();
        $this->avatars->store($user, $request->file('avatar'));

        return UserResource::withStats($user);
    }
}
