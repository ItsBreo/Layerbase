<?php

namespace App\Http\Requests\Admin;

use App\Enums\Stack;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Alta y edición de una categoría del catálogo.
 *
 * El slug NO se acepta como entrada: lo genera el modelo desde el nombre. Que
 * lo escribiera un humano solo abriría la puerta a slugs incoherentes con el
 * nombre y a romper enlaces ya publicados.
 *
 * `stack` admite además 'all' (transversal), que no está en el enum Stack
 * porque no es una tecnología: es la ausencia de restricción.
 */
class StoreCategoryRequest extends FormRequest
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
        // En edición, el nombre puede repetir el suyo propio.
        $ignore = $this->route('category')?->id;

        return [
            'name' => [
                $this->isMethod('POST') ? 'required' : 'sometimes',
                'string',
                'max:100',
                Rule::unique('categories', 'name')->ignore($ignore),
            ],
            'stack' => [
                $this->isMethod('POST') ? 'required' : 'sometimes',
                Rule::in([...Stack::values(), 'all']),
            ],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'Ya existe una categoría con ese nombre.',
        ];
    }
}
