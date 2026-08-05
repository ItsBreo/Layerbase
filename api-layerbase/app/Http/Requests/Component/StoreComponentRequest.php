<?php

namespace App\Http\Requests\Component;

use App\Enums\Stack;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación de la creación de un componente (siempre nace en `draft`). La
 * autorización (rol/propiedad) se resuelve en el controlador vía policy; aquí
 * solo se validan los datos de entrada.
 */
class StoreComponentRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:150'],
            // description corta: el modelo de datos la limita a 500 chars.
            'description' => ['required', 'string', 'max:500'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'stack' => ['required', Rule::enum(Stack::class)],
            // Precio en euros. 0 = gratuito. DECIMAL(8,2) ⇒ tope < 1.000.000.
            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            // Tags libres opcionales: se resuelven/crean por nombre.
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
