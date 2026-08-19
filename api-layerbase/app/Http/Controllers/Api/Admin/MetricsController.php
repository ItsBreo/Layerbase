<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ComponentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Component;
use App\Models\ComponentView;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Resumen de la plataforma para el panel de admin.
 *
 * Todo son agregaciones: ni una sola consulta trae filas completas. Sigue el
 * mismo criterio que `ModerationController::counts` y `UserController::counts`
 * — una query por bloque de datos, no una petición por dato.
 *
 * Solo lectura y solo admin (`role:admin` en la ruta).
 */
class MetricsController extends Controller
{
    /** Días que abarca la serie temporal y las altas "recientes". */
    private const WINDOW_DAYS = 30;

    /** Cuántos componentes se listan en cada tabla de "los que más". */
    private const TOP_LIMIT = 5;

    /** GET /admin/metrics */
    public function index(): JsonResponse
    {
        $since = now()->subDays(self::WINDOW_DAYS)->startOfDay();

        return response()->json([
            'data' => [
                'window_days' => self::WINDOW_DAYS,
                'users' => $this->users($since),
                'components' => $this->components($since),
                'activity' => $this->activity($since),
                'top_components' => $this->topComponents(),
                'top_authors' => $this->topAuthors(),
            ],
        ]);
    }

    /** Totales de usuarios: por rol, suspendidos y altas recientes. */
    private function users(\DateTimeInterface $since): array
    {
        $byRole = User::query()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        return [
            'total' => (int) $byRole->sum(),
            'banned' => User::query()->where('banned', true)->count(),
            'unverified' => User::query()->whereNull('email_verified_at')->count(),
            'recent' => User::query()->where('created_at', '>=', $since)->count(),
            'roles' => collect(UserRole::values())
                ->mapWithKeys(fn (string $role) => [$role => (int) ($byRole[$role] ?? 0)]),
        ];
    }

    /** Componentes por estado, más publicados recientes y descargas totales. */
    private function components(\DateTimeInterface $since): array
    {
        $byStatus = Component::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'total' => (int) $byStatus->sum(),
            'downloads' => (int) Component::query()->sum('downloads'),
            'published_recent' => Component::query()
                ->published()
                ->where('published_at', '>=', $since)
                ->count(),
            'statuses' => collect(ComponentStatus::values())
                ->mapWithKeys(fn (string $status) => [$status => (int) ($byStatus[$status] ?? 0)]),
        ];
    }

    /**
     * Serie diaria de visitas de los últimos días.
     *
     * Se devuelven SOLO los días con visitas; rellenar los huecos es cosa del
     * frontend, que es quien sabe cómo los va a pintar.
     */
    private function activity(\DateTimeInterface $since): array
    {
        $daily = ComponentView::query()
            ->where('viewed_on', '>=', $since)
            ->groupBy('viewed_on')
            ->orderBy('viewed_on')
            ->pluck(DB::raw('sum("count") as total'), 'viewed_on');

        return [
            'views_total' => (int) ComponentView::query()->sum('count'),
            'views_recent' => (int) $daily->sum(),
            'daily_views' => $daily->map(fn ($total) => (int) $total),
        ];
    }

    /** Los componentes con más visitas acumuladas. */
    private function topComponents(): array
    {
        return Component::query()
            ->published()
            ->withSum('views as views_total', 'count')
            ->with('author:id,name')
            // NULLS LAST no es opcional: `withSum` devuelve NULL cuando un
            // componente no tiene ninguna visita, y PostgreSQL ordena los NULL
            // los PRIMEROS en DESC — la lista de "más visitados" empezaba por
            // los que no tenían ninguna. SQLite (los tests) los pone al final,
            // así que esto no se ve hasta el entorno real.
            ->orderByRaw('views_total DESC NULLS LAST')
            ->orderByDesc('downloads')
            ->limit(self::TOP_LIMIT)
            ->get()
            ->map(fn (Component $component) => [
                'slug' => $component->slug,
                'title' => $component->title,
                'author' => $component->author?->name,
                'views' => (int) ($component->views_total ?? 0),
                'downloads' => (int) $component->downloads,
            ])
            ->all();
    }

    /** Autores con más componentes publicados. */
    private function topAuthors(): array
    {
        return User::query()
            // whereHas y no having(): un HAVING sin GROUP BY no es válido en
            // SQLite (los tests), y aquí además se lee mejor — se piden los
            // usuarios que TIENEN algo publicado.
            ->whereHas('components', fn ($query) => $query->published())
            ->withCount(['components as published_count' => fn ($query) => $query->published()])
            ->orderByDesc('published_count')
            ->limit(self::TOP_LIMIT)
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'components' => (int) $user->published_count,
            ])
            ->all();
    }
}
