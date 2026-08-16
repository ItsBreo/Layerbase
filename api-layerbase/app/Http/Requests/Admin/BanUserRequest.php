<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Suspensión de una cuenta. El motivo es obligatorio: queda guardado en
 * `users.ban_reason` y es lo único que explica la suspensión cuando alguien
 * (el propio usuario o el siguiente admin) pregunta por qué.
 */
class BanUserRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Indica el motivo de la suspensión.',
            'reason.min' => 'El motivo debe explicar la suspensión (mínimo 10 caracteres).',
        ];
    }
}
