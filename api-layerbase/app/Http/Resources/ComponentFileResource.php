<?php

namespace App\Http\Resources;

use App\Models\ComponentFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Metadatos públicos de un archivo de componente.
 *
 * NUNCA se serializa `path` ni el disco (son detalles internos de storage), ni
 * se genera URL para el `source`: el código fuente solo se entrega vía el
 * endpoint protegido /components/{id}/download con URL firmada temporal.
 *
 * @mixin ComponentFile
 */
class ComponentFileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => $this->type,
            'filename' => $this->filename,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            // Solo los archivos no protegidos (readme/preview) exponen URL
            // temporal directa; el source jamás la expone aquí.
            'url' => $this->when(
                ! $this->type->isProtected(),
                fn () => $this->temporaryUrl(),
            ),
        ];
    }
}
