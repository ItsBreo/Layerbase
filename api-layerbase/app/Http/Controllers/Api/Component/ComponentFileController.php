<?php

namespace App\Http\Controllers\Api\Component;

use App\Enums\ComponentFileType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Component\UploadComponentFileRequest;
use App\Http\Resources\ComponentFileResource;
use App\Models\Component;
use App\Services\ComponentFileService;
use Illuminate\Http\JsonResponse;

/**
 * Subida y entrega de archivos de un componente.
 *
 * La subida solo la hace el autor propietario (policy `update`). La descarga
 * del código fuente está protegida: autor, comprador o componente gratuito, y
 * se sirve como URL firmada temporal (nunca el archivo directo ni su ruta).
 */
class ComponentFileController extends Controller
{
    public function __construct(private readonly ComponentFileService $files) {}

    /**
     * POST /components/{component}/files — sube/reemplaza un archivo. Solo el
     * autor y solo si el componente es editable (misma regla que la edición).
     */
    public function store(UploadComponentFileRequest $request, Component $component): JsonResponse
    {
        $this->authorize('update', $component);

        $type = ComponentFileType::from($request->input('type'));
        $file = $this->files->store($component, $request->file('file'), $type);

        return (new ComponentFileResource($file))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /components/{component}/download — devuelve una URL firmada temporal
     * (5 min) para descargar el código fuente. Autorización vía policy
     * (autor / comprador / gratuito). No expone el archivo directamente.
     */
    public function download(Component $component): JsonResponse
    {
        $this->authorize('downloadSource', $component);

        $source = $component->fileOfType(ComponentFileType::Source);

        abort_if($source === null, 404, 'Este componente no tiene código fuente disponible.');

        // TODO(descargas): incrementar el contador `downloads` de forma atómica
        // aquí (o vía evento) cuando se consolide la métrica.

        return response()->json([
            'url' => $source->temporaryUrl(),
            'filename' => $source->filename,
            'expires_in' => (int) config('components.download_url_ttl', 5) * 60,
        ]);
    }
}
