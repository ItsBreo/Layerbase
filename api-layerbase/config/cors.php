<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    |
    | En desarrollo el SPA llega vía el proxy de Vite (mismo origen), así que
    | CORS no interviene. En producción, con el front en otro dominio, los
    | orígenes permitidos se definen por entorno (CORS_ALLOWED_ORIGINS, lista
    | separada por comas). Nunca usamos '*' junto a credenciales.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Se recorta cada elemento: una lista escrita como "https://a, https://b"
    // dejaría el segundo origen con un espacio delante y no casaría con ninguna
    // petición — un fallo de despliegue que solo se ve como un CORS bloqueado
    // en la consola del navegador, sin nada en los logs del servidor.
    'allowed_origins' => array_values(array_filter(array_map(
        trim(...),
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', (string) env('FRONTEND_URL', 'http://localhost:5173')))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // El SPA usa tokens Bearer, no cookies de sesión cross-site.
    'supports_credentials' => false,

];
