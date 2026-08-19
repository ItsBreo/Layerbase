<?php

namespace App\Observers;

use App\Models\Component;
use App\Models\Review;

/**
 * Mantiene al día la nota del componente valorado.
 *
 * `rating_avg` y `rating_count` existían desde la primera migración y se
 * enseñaban en tarjetas, ficha y resumen de autor, pero nadie las escribía:
 * eran siempre lo que hubiera dejado el seeder. Tercer contador con el mismo
 * problema, después de `downloads` y los del catálogo.
 *
 * Se engancha `saved` y no `created` porque la nota cambia también al EDITAR
 * una valoración existente (de 5 a 2 estrellas) y al reportarla, que la saca
 * del cálculo sin borrarla.
 */
class ReviewObserver
{
    public function saved(Review $review): void
    {
        $this->recount($review);
    }

    public function deleted(Review $review): void
    {
        $this->recount($review);
    }

    public function restored(Review $review): void
    {
        $this->recount($review);
    }

    public function forceDeleted(Review $review): void
    {
        $this->recount($review);
    }

    private function recount(Review $review): void
    {
        Component::recountRatings([$review->component_id]);
    }
}
