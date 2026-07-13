<?php

namespace App\Http\Requests\Component;

use App\Enums\ComponentFileType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validación de la subida de un archivo de componente (source/readme/preview).
 * Un componente tiene como máximo un archivo de cada tipo: si se vuelve a subir
 * el mismo tipo, el controlador reemplaza el anterior.
 */
class UploadComponentFileRequest extends FormRequest
{
    /** Límite duro de tamaño: 5 MB, expresado en kilobytes para la regla `max`. */
    private const MAX_KB = 5 * 1024;

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
            'type' => ['required', Rule::enum(ComponentFileType::class)],
            // 5 MB máx. Se validan MIME por tipo abajo, en withValidator, porque
            // dependen del valor de `type`.
            'file' => ['required', 'file', 'max:'.self::MAX_KB],
        ];
    }

    /**
     * MIME permitido según el tipo de archivo:
     *  - source:  zip (el código empaquetado).
     *  - readme:  markdown / texto plano.
     *  - preview: imagen.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $type = $this->input('type');
            $file = $this->file('file');

            if ($file === null || $type === null) {
                return;
            }

            $mime = $file->getMimeType();
            $allowed = match ($type) {
                ComponentFileType::Source->value => ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
                ComponentFileType::Readme->value => ['text/markdown', 'text/plain', 'text/x-markdown'],
                ComponentFileType::Preview->value => ['image/png', 'image/jpeg', 'image/webp'],
                default => [],
            };

            if (! in_array($mime, $allowed, strict: true)) {
                $validator->errors()->add('file', "El tipo MIME '{$mime}' no está permitido para un archivo '{$type}'.");
            }
        });
    }
}
