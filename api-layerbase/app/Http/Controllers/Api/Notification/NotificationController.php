<?php

namespace App\Http\Controllers\Api\Notification;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notificaciones in-app del usuario autenticado.
 *
 * No hay parámetro de usuario en ninguna ruta: se opera SIEMPRE sobre
 * `$request->user()`, así que no existe la posibilidad de leer ni marcar las de
 * otra persona. Mismo criterio que en `ProfileController`.
 */
class NotificationController extends Controller
{
    /** GET /notifications — las del usuario, más recientes primero. */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->paginate(15);

        return response()->json([
            'data' => $notifications->getCollection()->map(fn ($notification) => [
                'id' => $notification->id,
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
                // El payload se guarda como JSON por tipo: cada notificación
                // lleva lo suyo, y es el frontend quien decide cómo pintarlo.
                ...$notification->data,
            ]),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
                'unread' => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * GET /notifications/unread-count — solo el número.
     *
     * Endpoint aparte del listado porque la campana lo consulta a menudo y no
     * necesita traerse las notificaciones enteras para pintar un contador.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['unread' => $request->user()->unreadNotifications()->count()]);
    }

    /** POST /notifications/{id}/read — marca una como leída. */
    public function markRead(Request $request, string $id): JsonResponse
    {
        // findOrFail SOBRE la relación del usuario: el id de otra persona da
        // 404, no un acceso indebido.
        $request->user()->notifications()->findOrFail($id)->markAsRead();

        return response()->json(['message' => 'Notificación marcada como leída.']);
    }

    /** POST /notifications/read-all — marca todas como leídas. */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'Todas marcadas como leídas.']);
    }
}
