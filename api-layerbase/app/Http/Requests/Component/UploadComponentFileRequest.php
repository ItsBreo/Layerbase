<?php

namespace App\Http\Requests\Component;

use App\Enums\ComponentFileType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
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

    /** Extensiones aceptadas para el README. */
    private const README_EXTENSIONS = ['md', 'markdown', 'txt'];

    /**
     * Validación por tipo de archivo:
     *  - source:  zip (el código empaquetado).
     *  - preview: imagen.
     *  - readme:  texto UTF-8 con extensión de markdown (ver `validateReadme`).
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $type = $this->input('type');
            $file = $this->file('file');

            if ($file === null || $type === null) {
                return;
            }

            if ($type === ComponentFileType::Readme->value) {
                $this->validateReadme($validator, $file);

                return;
            }

            // Para zip e imagen el sniffing por contenido SÍ es fiable: un zip
            // y un PNG tienen cabeceras inequívocas.
            $mime = $file->getMimeType();
            $allowed = match ($type) {
                ComponentFileType::Source->value => ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
                ComponentFileType::Preview->value => ['image/png', 'image/jpeg', 'image/webp'],
                default => [],
            };

            if (! in_array($mime, $allowed, strict: true)) {
                $validator->errors()->add('file', "El tipo MIME '{$mime}' no está permitido para un archivo '{$type}'.");
            }
        });
    }

    /**
     * El README no se puede validar por MIME sniffeado.
     *
     * finfo clasifica por CONTENIDO, y un README de un componente lleva bloques
     * de código: uno con ```jsx se detecta como `application/javascript`, otro
     * con HTML como `text/html`, etc. Filtrar por MIME rechazaba justo los
     * READMEs útiles. Lo que de verdad importa es que sea texto legible y no un
     * binario disfrazado, así que se valida extensión + UTF-8 válido. No hay
     * riesgo de ejecución: el contenido solo se renderiza como Markdown.
     */
    private function validateReadme($validator, UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, self::README_EXTENSIONS, strict: true)) {
            $validator->errors()->add('file', 'El README debe ser un archivo .md, .markdown o .txt.');

            return;
        }

        $contents = file_get_contents($file->getRealPath());

        if ($contents === false || ! mb_check_encoding($contents, 'UTF-8')) {
            $validator->errors()->add('file', 'El README debe ser texto UTF-8 válido.');
        }
    }
}
