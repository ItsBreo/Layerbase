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

    'allowed_origins' => array_filter(
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', (string) env('FRONTEND_URL', 'http://localhost:5173')))
    ),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // El SPA usa tokens Bearer, no cookies de sesión cross-site.
    'supports_credentials' => false,

];
