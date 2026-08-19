<?php

namespace App\Notifications;

use App\Models\Component;
use Illuminate\Notifications\Notification;

/**
 * Al autor: su componente ha sido aprobado y ya está publicado.
 *
 * Solo canal `database` (in-app). Añadir el correo más adelante es meter
 * `'mail'` en `via()` y escribir `toMail()`; el resto no cambia.
 */
class ComponentApproved extends Notification
{
    public function __construct(private readonly Component $component) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * El payload guarda un SNAPSHOT del título, no solo el id.
     *
     * Una notificación cuenta algo que pasó en un momento dado: si el autor
     * renombra el componente después, el aviso debe seguir diciendo cómo se
     * llamaba entonces. Además así el listado no necesita un join por fila.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'component_approved',
            'component_slug' => $this->component->slug,
            'component_title' => $this->component->title,
        ];
    }
}
