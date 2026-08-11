<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Subida de la foto de perfil. Imagen real (no solo extensión: `image` valida
 * con getimagesize) y tamaño limitado por config/profile.php.
 */
class UploadAvatarRequest extends FormRequest
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
            'avatar' => [
                'required',
                'image',
                'mimes:png,jpg,jpeg,webp',
                'max:'.(int) config('profile.avatar_max_kb', 2048),
            ],
        ];
    }
}
