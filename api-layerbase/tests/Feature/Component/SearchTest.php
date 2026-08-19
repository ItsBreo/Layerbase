<?php

namespace Tests\Feature\Component;

use App\Enums\ComponentStatus;
use App\Enums\Stack;
use App\Models\Category;
use App\Models\Component;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Buscador del marketplace (`GET /components?q=`).
 *
 * Sustituye al `LIKE '%término%'` original con la búsqueda de texto completo de
 * PostgreSQL, más un plan B por similitud de trigramas cuando la primera no
 * encuentra nada.
 *
 * Estos tests SOLO pueden correr contra PostgreSQL: `to_tsvector`,
 * `websearch_to_tsquery` y `word_similarity` no existen en SQLite. Son la razón
 * de que la suite entera dejara de correr en memoria (ver `phpunit.xml`).
 */
class SearchTest extends TestCase
{
    use RefreshDatabase;

    // --- Lo que tiene que encontrar ---------------------------------------

    public function test_it_finds_a_component_by_a_word_in_its_title(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');
        $this->makeComponent('Modal de confirmación', 'Pregunta antes de borrar.');

        $this->search('carrusel')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Carrusel infinito');
    }

    public function test_it_ignores_accents_in_both_directions(): void
    {
        $this->makeComponent('Botón elástico', 'Rebota al pulsarlo.');

        // Escribiendo sin acento se encuentra lo acentuado...
        $this->search('boton')->assertJsonCount(1, 'data');

        // ...y al revés, que es el caso que se olvida siempre.
        $this->makeComponent('Elastic Button', 'Bounces on click.');
        $this->search('bútton')->assertJsonCount(1, 'data');
    }

    public function test_it_ignores_capitalisation(): void
    {
        $this->makeComponent('Modal de confirmación', 'Pregunta antes de borrar.');

        // En PostgreSQL `LIKE` distingue mayúsculas, así que el buscador
        // anterior fallaba justo aquí. SQLite lo tapaba: allí no distingue.
        $this->search('MODAL')->assertJsonCount(1, 'data');
    }

    public function test_it_matches_the_root_of_the_word(): void
    {
        $this->makeComponent('Botones de acción', 'Varios estilos.');

        // Buscar en singular tiene que encontrar el plural: es la diferencia
        // entre indexar palabras y indexar cadenas de texto.
        $this->search('boton')->assertJsonCount(1, 'data');
    }

    public function test_it_also_searches_the_description(): void
    {
        $this->makeComponent('Widget K7', 'Incluye un calendario desplegable.');

        $this->search('calendario')->assertJsonCount(1, 'data');
    }

    // --- Relevancia --------------------------------------------------------

    public function test_a_match_in_the_title_outranks_a_match_in_the_description(): void
    {
        // El de la descripción se publica DESPUÉS, así que por fecha iría
        // primero: si el orden sale bien es por relevancia, no por casualidad.
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');
        $this->makeComponent('Galería de fotos', 'Por dentro monta un carrusel.');

        $data = $this->search('carrusel')->assertOk()->json('data');

        $this->assertCount(2, $data);
        $this->assertSame('Carrusel infinito', $data[0]['title']);
    }

    public function test_an_explicit_sort_wins_over_relevance(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.', price: 40);
        $this->makeComponent('Galería de fotos', 'Por dentro monta un carrusel.', price: 5);

        // Pedir "de más barato a más caro" y recibir otra cosa sería ignorar una
        // petición explícita; la relevancia se queda en desempate.
        $data = $this->search('carrusel', ['sort' => 'price_asc'])->json('data');

        $this->assertSame('Galería de fotos', $data[0]['title']);
    }

    // --- Plan B: erratas ---------------------------------------------------

    public function test_a_typo_still_finds_the_component(): void
    {
        $this->makeComponent('Minimal Carousel', 'Un carrusel sobrio.');

        // "carusel" no casa con ninguna palabra indexada: solo llega por
        // similitud de trigramas.
        $this->search('carusel')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Minimal Carousel');
    }

    public function test_the_fuzzy_search_does_not_kick_in_when_there_are_real_matches(): void
    {
        $this->makeComponent('Modal de confirmación', 'Pregunta antes de borrar.');
        // Se parece lo justo para colarse por trigramas, pero no contiene la
        // palabra: no debe aparecer mientras haya aciertos de verdad.
        $this->makeComponent('Modelo de datos', 'Diagrama entidad-relación.');

        $this->search('modal')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Modal de confirmación');
    }

    public function test_the_response_says_when_the_results_are_only_similar(): void
    {
        $this->makeComponent('Minimal Carousel', 'Un carrusel sobrio.');

        // Quien busca "carusel" recibe algo que NO contiene lo que escribió; sin
        // este aviso no puede distinguir "me está corrigiendo" de "ha entendido
        // cualquier cosa".
        $this->search('carusel')
            ->assertOk()
            ->assertJsonPath('search.fuzzy', true)
            ->assertJsonPath('search.term', 'carusel');

        // Cuando acierta de verdad no hay nada que avisar.
        $this->search('carousel')
            ->assertOk()
            ->assertJsonPath('search.fuzzy', false);
    }

    public function test_an_empty_result_is_not_announced_as_similar(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');

        // El plan B se ejecutó y tampoco encontró nada: "no hay resultados" no
        // es "esto es lo más parecido".
        $this->search('zzzqqqxxx')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('search.fuzzy', false);
    }

    public function test_something_that_resembles_nothing_returns_empty(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');

        // El plan B tiene umbral: sin él, cualquier cosa devolvería cualquier
        // cosa y el buscador dejaría de significar nada.
        $this->search('zzzqqqxxx')->assertOk()->assertJsonCount(0, 'data');
    }

    // --- Frontera: qué NO puede salir --------------------------------------

    public function test_the_search_never_returns_unpublished_components(): void
    {
        $draft = $this->makeComponent('Carrusel secreto', 'Aún sin terminar.', ComponentStatus::Draft);
        $this->makeComponent('Carrusel en revisión', 'Enviado.', ComponentStatus::PendingReview);
        $this->makeComponent('Carrusel rechazado', 'No pasó.', ComponentStatus::Rejected);

        /*
         * Esta es la razón principal de no montar un motor de búsqueda aparte:
         * al ser la misma query sobre la misma tabla, `published()` sigue
         * aplicando. Un índice externo es una COPIA, y una copia mal
         * sincronizada acaba enseñando borradores ajenos.
         */
        $this->search('carrusel')->assertOk()->assertJsonCount(0, 'data');

        // Ni siquiera a su propio autor: el listado público es público.
        $this->actingAs($draft->author)
            ->getJson('/api/components?q=carrusel')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_the_fuzzy_fallback_also_respects_the_published_filter(): void
    {
        $this->makeComponent('Minimal Carousel', 'Un carrusel sobrio.', ComponentStatus::Draft);

        // El plan B se ejecuta justo cuando no hay resultados, que es cuando es
        // más fácil que se cuele algo que no debería estar.
        $this->search('carusel')->assertOk()->assertJsonCount(0, 'data');
    }

    // --- Convivencia con el resto del listado ------------------------------

    public function test_the_search_combines_with_the_other_filters(): void
    {
        $this->makeComponent('Carrusel gratis', 'Pasa fotos.', price: 0);
        $this->makeComponent('Carrusel de pago', 'Pasa fotos mejor.', price: 25);

        $this->search('carrusel', ['free' => 1])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Carrusel gratis');
    }

    public function test_an_empty_search_returns_the_whole_listing(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');
        $this->makeComponent('Modal de confirmación', 'Pregunta antes de borrar.');

        // Una caja de búsqueda vacía no es una búsqueda de la cadena vacía.
        $this->search('')->assertOk()->assertJsonCount(2, 'data');
        $this->search('   ')->assertOk()->assertJsonCount(2, 'data');
    }

    // --- Entrada hostil ----------------------------------------------------

    public function test_operator_soup_does_not_break_the_search(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');

        /*
         * `websearch_to_tsquery` se eligió justamente por esto: `plainto_tsquery`
         * y `to_tsquery` revientan con sintaxis inválida, y esto sale de una
         * caja de texto donde la gente escribe lo que le da la gana. Aquí lo que
         * se comprueba es que responde 200, no que encuentre algo.
         */
        foreach (['&&&', '!!!', '(((', 'a & | b', '"sin cerrar', '<>', ':*'] as $garbage) {
            $this->search($garbage)->assertOk();
        }
    }

    public function test_a_quoted_phrase_searches_the_exact_phrase(): void
    {
        $this->makeComponent('Modal de confirmación', 'Pregunta antes de borrar.');
        $this->makeComponent('Confirmación por email', 'Modal aparte.');

        // Las comillas son sintaxis de `websearch_to_tsquery`, y son la razón de
        // haberlo preferido a `plainto_tsquery`.
        $data = $this->search('"modal de confirmación"')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('Modal de confirmación', $data[0]['title']);
    }

    public function test_a_minus_sign_excludes_a_word(): void
    {
        $this->makeComponent('Carrusel infinito', 'Pasa fotos solo.');
        $this->makeComponent('Carrusel manual', 'Con flechas.');

        $data = $this->search('carrusel -manual')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('Carrusel infinito', $data[0]['title']);
    }

    // --- Helpers ----------------------------------------------------------

    /** @param  array<string, mixed>  $extra */
    private function search(string $term, array $extra = []): TestResponse
    {
        return $this->getJson('/api/components?'.http_build_query(['q' => $term] + $extra));
    }

    private function makeComponent(
        string $title,
        string $description,
        ComponentStatus $status = ComponentStatus::Published,
        int $price = 0,
    ): Component {
        $category = Category::create(['name' => 'Cards '.uniqid(), 'stack' => 'all']);

        $component = new Component([
            'title' => $title,
            'description' => $description,
            'category_id' => $category->id,
            'stack' => Stack::React->value,
            'price' => $price,
        ]);
        $component->user_id = User::factory()->author()->create()->id;
        $component->status = $status;
        $component->published_at = $status === ComponentStatus::Published ? now() : null;
        $component->save();

        return $component->fresh();
    }
}
