<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Disco de archivos de componentes
    |--------------------------------------------------------------------------
    |
    | Disco donde se guardan source/readme/preview. En desarrollo 'local'; en
    | producción 's3'/'r2'. Si es null se usa el disco por defecto de
    | config/filesystems.php.
    |
    | AVISO: el disco DEBE soportar URLs temporales firmadas, porque el código
    | fuente de un componente de pago solo se entrega así. 'local' las soporta
    | gracias a `serve => true` en config/filesystems.php. NO usar 'public': lo
    | sirve nginx directamente, sin firma ni caducidad, y eso repartiría el
    | código de los componentes de pago saltándose la autorización.
    | ComponentFile::temporaryUrl() lanza excepción si el disco no las soporta.
    |
    | Tampoco vale 's3_public': ese es el bucket público de los avatares. El
    | disco correcto desplegado es 's3', el bucket privado. Son dos buckets
    | distintos justamente para que el dominio público no llegue nunca al
    | código fuente.
    |
    */
    'files_disk' => env('COMPONENTS_FILES_DISK', env('FILESYSTEM_DISK', 'local')),

    /*
    |--------------------------------------------------------------------------
    | Caducidad de las URLs firmadas de descarga (minutos)
    |--------------------------------------------------------------------------
    */
    'download_url_ttl' => (int) env('COMPONENTS_DOWNLOAD_TTL', 5),

    /*
    |--------------------------------------------------------------------------
    | Búsqueda
    |--------------------------------------------------------------------------
    |
    | El buscador del listado usa la búsqueda de texto completo de PostgreSQL
    | (columna generada `components.search_vector`, con el título pesando más
    | que la descripción).
    |
    | Cuando esa búsqueda no devuelve NADA se intenta una segunda pasada por
    | similitud de trigramas sobre el título, que es lo que permite que
    | "carusel" encuentre "Carousel". El umbral decide cuánto se parece algo
    | para considerarse un acierto:
    |
    |   - más bajo  → más tolerante, más ruido
    |   - más alto  → menos ruido, más "no hay resultados"
    |
    | 0.4 está medido contra el catálogo real: separa los aciertos (0.55-0.60)
    | del ruido (0.20-0.38). Es un valor a reajustar si el catálogo cambia de
    | tamaño o de idioma.
    |
    */
    'search' => [
        'fuzzy_threshold' => (float) env('COMPONENTS_SEARCH_FUZZY_THRESHOLD', 0.4),
    ],

];
