<?php

namespace App\Notifications;

use App\Models\Component;
use Illuminate\Notifications\Notification;

/**
 * A los administradores: hay un componente esperando revisión.
 *
 * Sin esto, la cola solo se descubre entrando a mirarla. Un autor podía esperar
 * días sin que nadie supiera que había enviado algo.
 */
class ComponentSubmitted extends Notification
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
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'component_submitted',
            'component_slug' => $this->component->slug,
            'component_title' => $this->component->title,
            'author_name' => $this->component->author?->name,
        ];
    }
}
