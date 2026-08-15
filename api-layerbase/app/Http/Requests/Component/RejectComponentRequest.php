<?php

namespace App\Http\Requests\Component;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validación del rechazo de un componente en moderación. La autorización
 * (rol admin) se resuelve en el controlador vía policy; aquí solo el motivo.
 *
 * El motivo es OBLIGATORIO por decisión de producto: un rechazo mudo deja al
 * autor sin saber qué corregir y convierte la moderación en un muro. El mínimo
 * de 10 caracteres corta el "no" a secas sin llegar a exigir un ensayo.
 */
class RejectComponentRequest extends FormRequest
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
            'reason.required' => 'Indica el motivo del rechazo: el autor lo necesita para corregir.',
            'reason.min' => 'El motivo debe explicar qué corregir (mínimo 10 caracteres).',
        ];
    }
}
