<?php

namespace App\Policies;

use App\Models\Component;
use App\Models\User;

/**
 * Autorización sobre componentes. Regla base: solo el autor propietario (o un
 * admin) gestiona su componente, y no se puede editar/borrar mientras esté
 * publicado o en revisión (hay que despublicar/esperar antes).
 *
 * El listado público y el detalle no pasan por aquí: se filtran en query
 * (scopePublished) porque no dependen de un usuario autenticado.
 */
class ComponentPolicy
{
    /**
     * Atajo global: un admin puede todo. Devolver null deja seguir al método
     * concreto; devolver true/false corta.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    /** Ver un componente que no está publicado: solo su autor. */
    public function view(User $user, Component $component): bool
    {
        return $component->isOwnedBy($user);
    }

    /** Cualquier usuario autenticado puede crear un borrador. */
    public function create(User $user): bool
    {
        return true;
    }

    /** Editar: autor propietario y solo si el estado lo permite. */
    public function update(User $user, Component $component): bool
    {
        return $component->isOwnedBy($user) && $component->isEditable();
    }

    /**
     * Borrar: autor propietario. La distinción soft-delete vs. unpublish (si
     * tiene compras) la resuelve el controlador; la policy solo decide la
     * propiedad.
     */
    public function delete(User $user, Component $component): bool
    {
        return $component->isOwnedBy($user);
    }

    /** Enviar a revisión (draft → pending_review): autor propietario. */
    public function submit(User $user, Component $component): bool
    {
        return $component->isOwnedBy($user);
    }

    /** Despublicar (published → unpublished): autor propietario. */
    public function unpublish(User $user, Component $component): bool
    {
        return $component->isOwnedBy($user);
    }

    /** Volver a borrador tras un rechazo o una despublicación: autor propietario. */
    public function revert(User $user, Component $component): bool
    {
        return $component->isOwnedBy($user);
    }

    /**
     * Moderar (aprobar o rechazar): SOLO admin. El autor no puede publicarse a
     * sí mismo, que es justo lo que separa `submit` de `approve`.
     *
     * En la práctica `before()` ya corta en true para los admin y este cuerpo
     * no llega a evaluarse, pero se deja explícito: si algún día se acota el
     * atajo global, la regla real sigue escrita aquí y no se abre un agujero
     * por omisión.
     */
    public function moderate(User $user, Component $component): bool
    {
        return $user->isAdmin();
    }

    /** Descargar el código fuente: delega en la regla de dominio del modelo. */
    public function downloadSource(User $user, Component $component): bool
    {
        return $component->userCanAccessSource($user);
    }

    /**
     * Renderizar el componente en el sandbox de la ficha pública.
     *
     * Se separa de `downloadSource` porque el visitante puede ser un invitado
     * (de ahí el `?User`), pero la regla de fondo es la misma: el código solo
     * viaja al navegador si es gratuito, propio o comprado. En un componente de
     * pago el source ES el producto, así que ahí nunca hay render en vivo: la
     * ficha cae a la imagen de portada.
     */
    public function previewSource(?User $user, Component $component): bool
    {
        // El componente tiene que ser visible: publicado, o del propio autor
        // (que previsualiza sus borradores desde el studio).
        if (! $component->isPublished() && ! $component->isOwnedBy($user)) {
            return false;
        }

        return $component->userCanAccessSource($user);
    }
}
