<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Disco de avatares
    |--------------------------------------------------------------------------
    |
    | Los avatares son públicos por naturaleza (se ven en cada tarjeta de
    | componente), así que van a un disco público y su URL es permanente — al
    | contrario que el código fuente, que se sirve con URL firmada temporal.
    |
    */
    'avatar_disk' => env('PROFILE_AVATAR_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Tamaño máximo del avatar (KB)
    |--------------------------------------------------------------------------
    |
    | Más bajo que el de los archivos de componente (5 MB): una foto de perfil
    | que pese más que eso es un error del usuario, no un caso legítimo.
    |
    */
    'avatar_max_kb' => (int) env('PROFILE_AVATAR_MAX_KB', 2048),

];
