<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ComponentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ComponentResource;
use App\Models\Component;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Cola de moderación del panel de admin.
 *
 * Es la contraparte de lectura de ComponentStateController::approve/reject: el
 * admin necesita ver qué hay esperando antes de poder resolverlo. Va bajo el
 * prefijo `/admin` (middleware `role:admin`) para que la frontera de
 * autorización se lea en la propia URL y en el fichero de rutas.
 *
 * Solo lectura: las transiciones viven en la máquina de estados, no aquí.
 */
class ModerationController extends Controller
{
    /**
     * GET /admin/components — componentes por estado, los más antiguos primero.
     *
     * El orden ASC es deliberado y no es el del marketplace: una cola de
     * revisión se atiende por antigüedad, o el componente que lleva más tiempo
     * esperando nunca sube. Por defecto muestra `pending_review`, que es a lo
     * que se entra a hacer al panel.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['sometimes', 'string', Rule::enum(ComponentStatus::class)],
        ]);

        $query = Component::query()
            ->where('status', $request->input('status', ComponentStatus::PendingReview->value))
            // `files` entra en el eager loading para resolver la portada de cada
            // fila sin una query por componente (mismo motivo que en Explore).
            ->with(['author', 'category', 'tags', 'files'])
            ->orderBy('updated_at')
            ->orderBy('id');

        $perPage = min((int) $request->integer('per_page', 15), 50);

        return ComponentResource::collection($query->paginate($perPage));
    }

    /**
     * GET /admin/components/counts — cuántos hay en cada estado.
     *
     * Una sola query agregada en vez de una petición por pestaña: el panel
     * necesita los contadores de todas las pestañas a la vez para pintarlos
     * junto al nombre.
     */
    public function counts(): JsonResponse
    {
        $counts = Component::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Se rellenan los estados sin filas para que el frontend no tenga que
        // distinguir entre "cero" y "ausente".
        $data = collect(ComponentStatus::values())
            ->mapWithKeys(fn (string $status) => [$status => (int) ($counts[$status] ?? 0)]);

        return response()->json(['data' => $data]);
    }
}
