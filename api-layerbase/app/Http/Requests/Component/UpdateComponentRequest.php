<?php

namespace App\Http\Requests\Component;

use App\Enums\Stack;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación de la edición de un componente. Todos los campos son opcionales
 * (PATCH parcial) pero, si vienen, deben ser válidos. La regla de que solo se
 * edita en estado editable la impone la ComponentPolicy, no esta clase.
 */
class UpdateComponentRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'required', 'string', 'max:500'],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'stack' => ['sometimes', 'required', Rule::enum(Stack::class)],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:999999.99'],
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
