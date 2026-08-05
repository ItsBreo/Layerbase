<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Disco de archivos de componentes
    |--------------------------------------------------------------------------
    |
    | Disco donde se guardan source/readme/preview. En desarrollo conviene
    | 'local' (o 'public'); en producción 's3'/'r2'. Si es null se usa el disco
    | por defecto de config/filesystems.php.
    |
    */
    'files_disk' => env('COMPONENTS_FILES_DISK', env('FILESYSTEM_DISK', 'local')),

    /*
    |--------------------------------------------------------------------------
    | Caducidad de las URLs firmadas de descarga (minutos)
    |--------------------------------------------------------------------------
    */
    'download_url_ttl' => (int) env('COMPONENTS_DOWNLOAD_TTL', 5),

];
