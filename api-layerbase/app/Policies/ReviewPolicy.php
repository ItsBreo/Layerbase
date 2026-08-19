<?php

namespace App\Policies;

use App\Models\Component;
use App\Models\Review;
use App\Models\User;

/**
 * Quién puede valorar y quién puede tocar una valoración.
 *
 * Reglas de fondo:
 *  - **Nadie valora su propio componente.** Es la que sostiene que la nota
 *    signifique algo; sin ella, un autor se pone cinco estrellas y listo.
 *  - **Una valoración es de quien la escribió.** Solo su autor la edita.
 *  - Un admin puede retirar cualquiera (moderación), pero NO editarla: cambiar
 *    las palabras de otro no es moderar, es suplantarlo.
 */
class ReviewPolicy
{
    /**
     * A diferencia de ComponentPolicy, aquí NO hay atajo `before()` para admin:
     * `update` debe seguir siendo exclusivo del autor incluso para ellos.
     */
    public function create(User $user, Component $component): bool
    {
        // Solo se valora lo que está publicado: un borrador no lo ha visto nadie.
        if (! $component->isPublished()) {
            return false;
        }

        if ($component->isOwnedBy($user)) {
            return false;
        }

        // El email verificado se exige por lo mismo que para publicar: que
        // detrás de una opinión pública haya una dirección comprobada.
        return $user->hasVerifiedEmail();
    }

    /** Editar: solo quien la escribió, ni siquiera un admin. */
    public function update(User $user, Review $review): bool
    {
        return $review->user_id === $user->id;
    }

    /** Borrar: su autor, o un admin retirándola. */
    public function delete(User $user, Review $review): bool
    {
        return $review->user_id === $user->id || $user->isAdmin();
    }

    /** Reportar: cualquiera que no sea quien la escribió. */
    public function report(User $user, Review $review): bool
    {
        return $review->user_id !== $user->id;
    }
}
