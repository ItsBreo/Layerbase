<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /** Endpoint público: cualquiera puede registrarse. */
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
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            // Password::defaults() centraliza la política de contraseñas en
            // AppServiceProvider (distinta en prod vs local). 'confirmed' exige
            // el campo password_confirmation.
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }

    /** Normaliza el email antes de validar (evita duplicados por mayúsculas). */
    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }
}
