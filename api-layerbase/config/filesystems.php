<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        /*
        | Bucket PRIVADO — archivos de componente (Cloudflare R2 o S3).
        |
        | No debe tener acceso público: el `source` de un componente de pago ES
        | el producto, y se sirve solo por URL firmada temporal a quien la
        | policy autoriza. Por eso no lleva `url`: si alguien la configurara,
        | `Storage::url()` empezaría a devolver enlaces permanentes.
        |
        | `throw => true` a propósito, al contrario que los discos locales. Con
        | almacenamiento remoto una subida puede fallar por red o credenciales,
        | y en silencio dejaría una fila en `component_files` apuntando a un
        | archivo que no existe. Mejor que reviente al subir.
        */
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            // Región real de AWS (p. ej. eu-west-1). Si algún día se usa
            // Cloudflare R2 en su lugar, allí la región es siempre 'auto'.
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => env('AWS_THROW', true),
            'report' => false,
        ],

        /*
        | Bucket PÚBLICO — avatares.
        |
        | Bucket distinto del anterior, no una carpeta dentro. El avatar necesita
        | una URL permanente y cacheable, y eso obliga a exponer el bucket
        | entero (dominio público de R2 o dominio propio). Si compartiera bucket
        | con los archivos de componente, ese mismo dominio serviría el código
        | fuente de los componentes de pago sin pasar por la policy — que es
        | exactamente la vulnerabilidad 1.3 por otra vía.
        |
        | `AWS_PUBLIC_URL` es el dominio público del bucket; sin él las URLs de
        | avatar salen mal formadas. En AWS es el dominio de CloudFront o el
        | del propio bucket.
        */
        's3_public' => [
            'driver' => 's3',
            'key' => env('AWS_PUBLIC_ACCESS_KEY_ID', env('AWS_ACCESS_KEY_ID')),
            'secret' => env('AWS_PUBLIC_SECRET_ACCESS_KEY', env('AWS_SECRET_ACCESS_KEY')),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_PUBLIC_BUCKET'),
            'url' => env('AWS_PUBLIC_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'visibility' => 'public',
            'throw' => env('AWS_THROW', true),
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
