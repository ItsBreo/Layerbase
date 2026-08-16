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
    */
    'files_disk' => env('COMPONENTS_FILES_DISK', env('FILESYSTEM_DISK', 'local')),

    /*
    |--------------------------------------------------------------------------
    | Caducidad de las URLs firmadas de descarga (minutos)
    |--------------------------------------------------------------------------
    */
    'download_url_ttl' => (int) env('COMPONENTS_DOWNLOAD_TTL', 5),

];
