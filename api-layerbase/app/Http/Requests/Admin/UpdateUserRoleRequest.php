<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Cambio de rol global de un usuario. La autorización (rol admin) la resuelve
 * el middleware `role:admin` de la ruta; la regla de "no puedes cambiarte el
 * tuyo" vive en el controlador, porque depende del usuario autenticado.
 */
class UpdateUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::enum(UserRole::class)],
        ];
    }
}
