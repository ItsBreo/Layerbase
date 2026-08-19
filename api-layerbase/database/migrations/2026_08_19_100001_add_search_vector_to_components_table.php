<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Búsqueda de texto completo sobre `components`, en PostgreSQL.
 *
 * Sustituye al `LIKE '%término%'` del listado, que no podía usar índice (el
 * comodín inicial obliga a recorrer la tabla entera), no distinguía un acierto
 * en el título de uno de pasada en la descripción, no entendía acentos y no
 * perdonaba una errata.
 *
 * Se descartó Meilisearch a propósito: es un servicio aparte, siempre encendido
 * y con disco persistente, que mantiene una COPIA de los datos. Esa copia habría
 * que sincronizarla y filtrarla por estado, con el riesgo de que un borrador o
 * un componente rechazado acabe apareciendo en el buscador público. Aquí sigue
 * siendo la misma query sobre la misma tabla, así que los `where` de estado, la
 * paginación y las policies siguen aplicando sin tocar nada.
 *
 * A partir de esta migración el proyecto depende de PostgreSQL de verdad (no
 * solo "está en el compose"). Por eso la suite de tests dejó de correr en
 * SQLite: ver el comentario de `phpunit.xml`.
 */
return new class extends Migration
{
    public function up(): void
    {
        // `unaccent` para que "boton" encuentre "Botón"; `pg_trgm` para tolerar
        // erratas ("carusel" → "Carrusel").
        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        /*
         * `unaccent()` es STABLE, no IMMUTABLE, porque en su forma de un
         * argumento depende del diccionario que haya configurado la sesión. Y
         * una columna generada (o un índice) SOLO admite expresiones
         * inmutables, así que usarla directamente falla.
         *
         * La salida estándar es envolverla fijando el diccionario de forma
         * explícita: con el diccionario fijo el resultado sí es determinista, y
         * ahí ya se puede declarar IMMUTABLE con verdad.
         */
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.f_unaccent(text)
            RETURNS text
            LANGUAGE sql
            IMMUTABLE PARALLEL SAFE STRICT
            AS $func$
                SELECT public.unaccent('public.unaccent', $1)
            $func$
        SQL);

        /*
         * Columna generada: PostgreSQL la mantiene sola en cada INSERT/UPDATE,
         * así que no hay nada que sincronizar ni observer que se pueda olvidar.
         *
         * Pesos: 'A' al título y 'B' a la descripción. Es lo que hace que un
         * componente que se llama "Carrusel" gane a otro que solo menciona la
         * palabra de pasada en su descripción.
         *
         * Configuración 'spanish' (no 'simple') para que la raíz de las
         * palabras cuente: así "botones" encuentra "botón". Los títulos en
         * inglés simplemente no se lematizan bien, que es inofensivo — degradan
         * al comportamiento de 'simple'.
         *
         * Los tags quedan fuera: una columna generada solo puede leer su propia
         * fila, y viven en una tabla pivote. Ya tienen su propio filtro (`tags`)
         * en el listado.
         */
        DB::statement(<<<'SQL'
            ALTER TABLE components
            ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('spanish', public.f_unaccent(coalesce(title, ''))), 'A')
                ||
                setweight(to_tsvector('spanish', public.f_unaccent(coalesce(description, ''))), 'B')
            ) STORED
        SQL);

        // GIN es el índice de un tsvector: la búsqueda pasa de recorrer la tabla
        // a consultar un índice invertido. Este es el camino rápido, el que
        // recorre cualquier búsqueda que acierte.
        DB::statement('CREATE INDEX components_search_vector_idx ON components USING GIN (search_vector)');

        /*
         * NO se crea índice de trigramas, y es deliberado.
         *
         * De pg_trgm solo se usa `word_similarity()`, y una llamada a la
         * función no puede usar índice: los únicos que lo aprovechan son los
         * operadores (`%`, `<%`), que comparan contra un umbral GLOBAL fijado
         * por sesión — 0.6 por defecto. Con ese umbral se caen aciertos
         * legítimos (medido: "carusel" contra "Minimal Carousel" da 0.545), y
         * bajarlo por configuración esconde en un ajuste de servidor algo que
         * decide qué resultados salen.
         *
         * Así que el umbral va explícito en `config/components.php`, se lee al
         * lado de la query, y el escaneo secuencial que eso implica se paga solo
         * en el camino lento: la búsqueda difusa es un PLAN B que únicamente se
         * ejecuta cuando la búsqueda normal no ha devuelto nada.
         *
         * Si el catálogo llega a un tamaño en el que eso pese, la salida es un
         * índice GIN con `gin_trgm_ops` y el operador `<%` con el umbral por
         * defecto, asumiendo que se pierden los aciertos flojos.
         */
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS components_search_vector_idx');
        DB::statement('ALTER TABLE components DROP COLUMN IF EXISTS search_vector');
        DB::statement('DROP FUNCTION IF EXISTS public.f_unaccent(text)');

        // Las extensiones NO se eliminan: son de la base de datos entera y otra
        // cosa podría estar usándolas. Quitarlas aquí sería salirse del alcance
        // de esta migración.
    }
};
