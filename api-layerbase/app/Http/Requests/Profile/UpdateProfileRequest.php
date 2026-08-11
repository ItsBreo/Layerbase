<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Edición del perfil público. Solo campos que el usuario controla: ni `email`
 * (cambiarlo exige reverificación, que aún no existe), ni `role`, ni los
 * `stripe_*`, ni `banned`.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:100'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:500'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            // Los handles se guardan sin @ ni URL: solo el nombre de usuario.
            'github_username' => ['sometimes', 'nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9-]+$/'],
            'twitter_username' => ['sometimes', 'nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_]+$/'],
            'stats_public' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Normaliza los handles antes de validar: quita la arroba y los espacios,
     * y convierte la cadena vacía en null (el formulario manda "" al borrar).
     */
    protected function prepareForValidation(): void
    {
        foreach (['github_username', 'twitter_username'] as $field) {
            if (! $this->has($field)) {
                continue;
            }

            $value = trim((string) $this->input($field));
            $value = ltrim($value, '@');

            $this->merge([$field => $value === '' ? null : $value]);
        }

        foreach (['bio', 'website'] as $field) {
            if ($this->has($field) && trim((string) $this->input($field)) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'github_username.regex' => 'El usuario de GitHub solo admite letras, números y guiones.',
            'twitter_username.regex' => 'El usuario de X solo admite letras, números y guiones bajos.',
        ];
    }
}
