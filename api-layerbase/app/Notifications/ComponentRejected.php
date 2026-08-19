<?php

namespace App\Notifications;

use App\Models\Component;
use Illuminate\Notifications\Notification;

/** Al autor: su componente ha sido rechazado, con el motivo. */
class ComponentRejected extends Notification
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
     * El motivo viaja DENTRO de la notificación en vez de obligar a abrir la
     * ficha: es la información por la que el autor va a entrar, y tenerla en el
     * propio aviso le ahorra el viaje.
     *
     * Se guarda el motivo de ESE rechazo. `components.rejection_reason` se
     * limpia al reenviar a revisión, así que leerlo desde ahí dejaría el
     * historial en blanco.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'component_rejected',
            'component_slug' => $this->component->slug,
            'component_title' => $this->component->title,
            'reason' => $this->component->rejection_reason,
        ];
    }
}
