# =============================================================================
# Imagen de producción — un solo contenedor, pensada para App Runner.
#
# Por qué no vale `docker/php/Dockerfile`: aquel es de desarrollo. Sirve PHP-FPM
# a secas y espera un Nginx en OTRO contenedor hablándole por la red interna
# (`app:9000`), monta el código como volumen en vez de copiarlo, e instala las
# dependencias en cada arranque. App Runner ejecuta un único contenedor que debe
# escuchar HTTP en $PORT y traer todo dentro. Son dos topologías distintas, no
# una variación de la misma.
# =============================================================================

# --- Etapa 1: base con las extensiones de PHP -------------------------------
# La comparten la etapa de dependencias y la final. Que Composer resuelva sobre
# ESTA base y no sobre la imagen oficial de Composer es deliberado: aquella no
# trae `exif` (la exige medialibrary) ni `pcntl`, así que resolvería contra una
# plataforma que no es la que luego ejecuta el código.
FROM php:8.4-fpm-alpine AS base

RUN apk add --no-cache \
        libzip \
        icu-libs \
        libpng \
        libjpeg-turbo \
        freetype \
        libpq \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        libzip-dev \
        icu-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        oniguruma-dev \
        postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo \
        pdo_pgsql \
        pgsql \
        mbstring \
        bcmath \
        intl \
        zip \
        gd \
        exif \
        pcntl \
        opcache \
    && apk del .build-deps

# --- Etapa 2: dependencias de PHP -------------------------------------------
FROM base AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Solo los manifiestos: mientras no cambien, Docker reutiliza esta capa aunque
# se haya tocado el código de la aplicación.
COPY api-layerbase/composer.json api-layerbase/composer.lock ./

# `--no-scripts` porque los scripts de Laravel llaman a `artisan`, que aún no
# está aquí. `--no-autoloader` porque generar el mapa de clases sin el código
# delante produciría un mapa vacío para `App\`: se genera en la etapa final.
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --no-interaction \
        --prefer-dist

# --- Etapa 3: imagen final --------------------------------------------------
FROM base AS runtime

# Nginx y Supervisor conviven aquí con PHP-FPM: en App Runner no hay un segundo
# contenedor al que delegar el servidor web.
RUN apk add --no-cache nginx supervisor gettext

WORKDIR /var/www/html

# Configuración. El php.ini es el MISMO que en desarrollo (ahí está el límite de
# subida de 8M, sin el cual los 5 MB que valida la aplicación no caben).
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-layerbase.ini
COPY docker/production/opcache.ini /usr/local/etc/php/conf.d/99-opcache.ini
COPY docker/production/php-fpm.conf /usr/local/etc/php-fpm.d/zz-layerbase.conf
COPY docker/production/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/production/supervisord.conf /etc/supervisor/supervisord.conf

# El código, y encima el vendor ya resuelto.
COPY api-layerbase/ /var/www/html/
COPY --from=vendor /app/vendor/ /var/www/html/vendor/

# El mapa de clases se genera ahora, con el código delante. Composer se copia
# solo para esto y se borra en la misma capa: no tiene nada que hacer en una
# imagen de producción.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN composer dump-autoload --no-dev --optimize --no-interaction \
    && rm -f /usr/bin/composer

# Un .env dentro de la imagen ganaría a las variables que inyecta App Runner y
# dejaría credenciales guardadas en el registro de imágenes.
RUN rm -f .env .env.example && rm -rf tests .github

# Directorios de escritura de Laravel. En App Runner el sistema de ficheros es
# efímero (vive en memoria), así que esto se recrea en cada instancia.
RUN mkdir -p storage/framework/cache/data \
             storage/framework/sessions \
             storage/framework/views \
             storage/logs \
             bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rw storage bootstrap/cache

# El Nginx de Alpine incluye `/etc/nginx/http.d/*.conf` (no `conf.d/`, que es
# para directivas de contexto principal) y corre como usuario `nginx`, no como
# `www-data`. Se borra su configuración de ejemplo: si se quedara, su `server`
# por defecto competiría con el nuestro por el puerto.
RUN rm -f /etc/nginx/http.d/default.conf \
    && mkdir -p /var/lib/nginx/tmp /run/nginx \
    && chown -R nginx:nginx /var/lib/nginx /run/nginx

COPY docker/production/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# Informativo: App Runner inyecta $PORT y el entrypoint lo aplica a Nginx.
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
