<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Alta y edición de una valoración.
 *
 * El mínimo de 20 caracteres viene del modelo de datos (§9) y tiene motivo:
 * una nota suelta sin explicación no ayuda a nadie a decidir, y es justo lo que
 * más se presta a desahogos de una línea.
 */
class StoreReviewRequest extends FormRequest
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
            'rating' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'integer', 'between:1,5'],
            'body' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'string', 'min:20', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rating.between' => 'La valoración va de 1 a 5 estrellas.',
            'body.min' => 'Cuenta un poco más: al menos 20 caracteres.',
        ];
    }
}
